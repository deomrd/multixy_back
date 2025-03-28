const { sendErrorMessage } = require('../services/errorService');
const { handleTryCatch } = require('../services/tryCatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Récupérer tous les produits avec leurs relations
const getAllProducts = async (req, res) => {
  try {
    const { offset = 0, limit = 6 } = req.query;

    const products = await prisma.product.findMany({
      skip: parseInt(offset),
      take: parseInt(limit),
    });

    const total = await prisma.product.count();

    res.json({
      success: true,
      data: products,
      page: Math.floor(offset / limit) + 1,
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits :', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des produits"
    });
  }
};




// Rechercher des produits avec auto-complétion
const searchProducts = async (req, res) => {
  const { query, limit = 10 } = req.query;  // Limite par défaut à 10 résultats

  if (!query || query.trim().length < 1) {
    return res.status(400).json({ message: "Veuillez fournir un terme de recherche." });
  }

  await handleTryCatch(async () => {
    try {
      await prisma.$connect();

      // Rechercher des produits dont le nom contient la requête de l'utilisateur (utilisation de LIKE pour auto-complétion)
      const products = await prisma.product.findMany({
        where: {
          name: {
            contains: query,  // Recherche partielle dans le nom
            mode: 'insensitive',  // Insensible à la casse
          },
          is_deleted: false,  // Filtrer les produits supprimés
        },
        take: parseInt(limit),  // Limiter le nombre de résultats
        include: {
          category: true,
          orderDetails: true,
          productReviews: true,
          stockHistory: true,
          cart: true,
          wishlist: true,
          orderReturns: true,
        },
      });

      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur", error });
    }
  }, res);
};



// Récupérer un produit par son ID avec ses relations
const getProductById = async (req, res) => {
  const { id } = req.params;

  await handleTryCatch(async () => {
    const product = await prisma.product.findUnique({
      where: { id_product: parseInt(id) },
      include: {
        category: true,
        orderDetails: true,
        productReviews: true,
        stockHistory: true,
        cart: true,
        wishlist: true,
        orderReturns: true,
      },
    });

    if (!product || product.is_deleted) {
      throw { code: 404, message: "Produit non trouvé." };
    }

    res.status(200).json(product);
  }, res);
};


// Créer un produit et enregistrer l'historique du stock
const createProduct = async (req, res) => {
  const { name, description, codeProduct, price, stock, image, id_category } = req.body;

  await handleTryCatch(async () => {
    if (!name || !price || !stock || !id_category) {
      throw { code: 400, message: 'Les champs obligatoires (name, price, stock, id_category) doivent être remplis' };
    }

    // Créer un nouveau produit
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        codeProduct,
        price: parseFloat(price),
        stock: parseInt(stock),
        image,
        id_category: parseInt(id_category),
      },
    });

    // Créer une entrée dans l'historique du stock pour ce produit
    const newStockHistory = await prisma.stockHistory.create({
      data: {
        id_product: newProduct.id_product,
        quantity_before: 0, // Avant la création, le stock était de 0
        quantity_after: parseInt(stock), // Le stock après la création
        movement_type: 'added', // Le type de mouvement (ajout de stock)
      },
    });

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      product: newProduct,
      stockHistory: newStockHistory,
    });
  }, res);
};

// Mettre à jour un produit
const updateProduct = async (req, res) => {
  const productId = parseInt(req.params.id);
  const { name, description, price, stock, image, id_category } = req.body;

  await handleTryCatch(async () => {
    const existingProduct = await prisma.product.findUnique({
      where: { id_product: productId },
    });

    if (!existingProduct || existingProduct.is_deleted) {
      throw { code: 404, message: 'Produit non trouvé' };
    }

    const updatedProduct = await prisma.product.update({
      where: { id_product: productId },
      data: {
        name: name !== undefined ? name : existingProduct.name,
        description: description !== undefined ? description : existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
        image: image !== undefined ? image : existingProduct.image,
        id_category: id_category !== undefined ? parseInt(id_category) : existingProduct.id_category,
      },
    });

    res.status(200).json({ success: true, message: 'Produit mis à jour avec succès', product: updatedProduct });
  }, res);
};

//  Supprimer un produit (soft delete)
const deleteProduct = async (req, res) => {
  const productId = parseInt(req.params.id);

  await handleTryCatch(async () => {
    const product = await prisma.product.findUnique({
      where: { id_product: productId },
    });

    if (!product || product.is_deleted) {
      throw { code: 404, message: 'Produit non trouvé' };
    }

    const deletedProduct = await prisma.product.update({
      where: { id_product: productId },
      data: { is_deleted: true },
    });

    res.status(200).json({ success: true, message: 'Produit supprimé avec succès', product: deletedProduct });
  }, res);
};


// Fonction pour récupérer les produits par catégorie avec pagination
const getProductsByCategory = async (req, res) => {
  const { categoryName } = req.params; // Nom de la catégorie passé dans l'URL
  const { page = 1, limit = 20 } = req.query; // Récupérer la page et la limite (par défaut page 1, limite 20)

  try {
    const products = await prisma.product.findMany({
      where: {
        category: {
          name: categoryName,
        },
        is_deleted: false, // Filtrer les produits supprimés
      },
      skip: (page - 1) * limit, // Sauter les produits déjà affichés
      take: limit, // Limiter le nombre de produits retournés
    });

    // Retourner les produits paginés
    res.status(200).json(products);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};




module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory
};
