const { sendErrorMessage } = require('../services/errorService');
const { handleTryCatch } = require('../services/tryCatchService');
const { PrismaClient } = require('@prisma/client');
const upload = require('../middlewares/uploadMiddleware');
const prisma = new PrismaClient();

// Récupérer tous les produits avec leurs relations
const getAllProducts = async (req, res) => {
  try {
    let { offset = 0, limit = 6 } = req.query;

    // Validation des entrées
    offset = parseInt(offset, 10);
    limit = parseInt(limit, 10);

    if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Les paramètres offset et limit doivent être des nombres valides et positifs.",
      });
    }

    // Récupération des produits avec pagination
    const products = await prisma.product.findMany({
      skip: offset,
      take: limit,
    });

    // Nombre total de produits
    const total = await prisma.product.count();

    res.json({
      success: true,
      data: products,
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des produits :", error);
    res.status(500).json({
      success: false,
      message: "Une erreur interne est survenue. Veuillez réessayer plus tard.",
    });
  }
};

const getAllProductsScroll = async (req, res) => {
  try {
    let { cursor, limit = 6 } = req.query;

    // Validation des entrées
    limit = parseInt(limit, 10);

    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre limit doit être un nombre valide et supérieur à 0.",
      });
    }

    // Récupération des produits avec pagination par curseur
    const products = await prisma.product.findMany({
      take: limit,
      ...(cursor ? { cursor: { id: parseInt(cursor) }, skip: 1 } : {}),
      orderBy: { id: "asc" },
    });

    // Déterminer le nouveau curseur
    const nextCursor = products.length > 0 ? products[products.length - 1].id : null;

    // Nombre total de produits
    const total = await prisma.product.count();

    res.json({
      success: true,
      data: products,
      limit,
      total,
      nextCursor,
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des produits :", error);
    res.status(500).json({
      success: false,
      message: "Une erreur interne est survenue. Veuillez réessayer plus tard.",
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
  // Utilisation du middleware Multer pour gérer l'upload de l'image
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    const { name, description, codeProduct, price, stock, id_category } = req.body;

    // Vérification des champs obligatoires
    if (!name || !codeProduct || !price || !stock || !id_category) {
      return res.status(400).json({
        success: false,
        message: 'Les champs obligatoires (name, codeProduct, price, stock, id_category) doivent être remplis',
      });
    }

    try {
      // Vérification si `codeProduct` existe déjà en base de données
      const existingProduct = await prisma.product.findFirst({
        where: { codeProduct },
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: `Le code produit "${codeProduct}" est déjà utilisé.`,
        });
      }

      // Conversion des types de données
      const parsedPrice = parseFloat(price);
      const parsedStock = parseInt(stock, 10);
      const parsedCategoryId = parseInt(id_category, 10);

      if (isNaN(parsedPrice) || isNaN(parsedStock) || isNaN(parsedCategoryId)) {
        return res.status(400).json({
          success: false,
          message: "Les champs price, stock et id_category doivent être des nombres valides",
        });
      }

      // Si une image est téléchargée, on ajoute son chemin à la base de données
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      // Création du produit
      const newProduct = await prisma.product.create({
        data: {
          name,
          description,
          codeProduct,
          price: parsedPrice,
          stock: parsedStock,
          image: imagePath,
          id_category: parsedCategoryId,
        },
      });

      // Création de l'historique du stock
      const newStockHistory = await prisma.stockHistory.create({
        data: {
          id_product: newProduct.id_product,
          quantity_before: 0,
          quantity_after: parsedStock,
          movement_type: 'added',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Produit créé avec succès',
        product: newProduct,
        stockHistory: newStockHistory,
      });

    } catch (error) {
      console.error('Erreur lors de la création du produit :', error);
      res.status(500).json({
        success: false,
        message: "Une erreur interne est survenue. Veuillez réessayer plus tard.",
      });
    }
  });
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
  getProductsByCategory,
  getAllProductsScroll
};