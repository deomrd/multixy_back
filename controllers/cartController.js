const { handleTryCatch } = require('../services/tryCatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ajouter un produit au panier
const addToCart = async (req, res) => {
  const { id_user, id_product, quantity } = req.body;

  await handleTryCatch(async () => {
    if (!id_user || !id_product || !quantity) {
      throw { code: 400, message: 'Les champs id_user, id_product et quantity sont obligatoires.' };
    }

    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id_product: id_product },
    });

    if (!product || product.is_deleted) {
      throw { code: 404, message: 'Produit non trouvé.' };
    }

    // Vérifier si l'article existe déjà dans le panier
    const existingCartItem = await prisma.cart.findFirst({
      where: { id_user, id_product, is_deleted: false },
    });

    if (existingCartItem) {
      // Mettre à jour la quantité si le produit est déjà dans le panier
      const updatedCartItem = await prisma.cart.update({
        where: { id_cart: existingCartItem.id_cart },
        data: { quantity: existingCartItem.quantity + quantity },
      });

      res.status(200).json({ success: true, message: 'Produit mis à jour dans le panier', cartItem: updatedCartItem });
    } else {
      // Ajouter un nouveau produit dans le panier
      const newCartItem = await prisma.cart.create({
        data: {
          id_user,
          id_product,
          quantity,
        },
      });

      res.status(201).json({ success: true, message: 'Produit ajouté au panier avec succès', cartItem: newCartItem });
    }
  }, res);
};

// Récupérer tous les produits dans le panier d'un utilisateur
const getCartByUser = async (req, res) => {
  const { id_user } = req.params;

  await handleTryCatch(async () => {
    const cartItems = await prisma.cart.findMany({
      where: { id_user: parseInt(id_user), is_deleted: false },
      include: {
        product: true, // Inclure les informations du produit
      },
    });

    if (!cartItems || cartItems.length === 0) {
      throw { code: 404, message: 'Aucun produit dans le panier.' };
    }

    res.status(200).json(cartItems);
  }, res);
};

// Supprimer un produit du panier
const removeFromCart = async (req, res) => {
  const { id_user, id_product } = req.params;

  await handleTryCatch(async () => {
    const cartItem = await prisma.cart.findFirst({
      where: { id_user: parseInt(id_user), id_product: parseInt(id_product), is_deleted: false },
    });

    if (!cartItem) {
      throw { code: 404, message: 'Produit non trouvé dans le panier.' };
    }

    // Mettre à jour le produit pour le marquer comme supprimé (soft delete)
    const deletedCartItem = await prisma.cart.update({
      where: { id_cart: cartItem.id_cart },
      data: { is_deleted: true },
    });

    res.status(200).json({ success: true, message: 'Produit supprimé du panier avec succès', cartItem: deletedCartItem });
  }, res);
};

// Mettre à jour la quantité d'un produit dans le panier
const updateCartItemQuantity = async (req, res) => {
  const { id_user, id_product } = req.params;
  const { quantity } = req.body;

  await handleTryCatch(async () => {
    if (!quantity) {
      throw { code: 400, message: 'La quantité doit être spécifiée.' };
    }

    const cartItem = await prisma.cart.findFirst({
      where: { id_user: parseInt(id_user), id_product: parseInt(id_product), is_deleted: false },
    });

    if (!cartItem) {
      throw { code: 404, message: 'Produit non trouvé dans le panier.' };
    }

    const updatedCartItem = await prisma.cart.update({
      where: { id_cart: cartItem.id_cart },
      data: { quantity: parseInt(quantity) },
    });

    res.status(200).json({ success: true, message: 'Quantité mise à jour dans le panier', cartItem: updatedCartItem });
  }, res);
};

module.exports = {
  addToCart,
  getCartByUser,
  removeFromCart,
  updateCartItemQuantity,
};
