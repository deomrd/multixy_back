const { handleTryCatch } = require('../services/tryCatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Créer une commande depuis le panier et envoyer sur WhatsApp
const createOrder = async (req, res) => {
  const { id_user } = req.body;

  await handleTryCatch(async () => {
    const cartItems = await prisma.cart.findMany({
      where: { id_user, is_deleted: false },
      include: { product: true },
    });

    if (!cartItems.length) {
      throw { code: 404, message: 'Votre panier est vide.' };
    }

    const total = cartItems.reduce((acc, item) => acc + item.quantity * item.product.price, 0);

    const order = await prisma.order.create({
      data: {
        id_user,
        total,
        status: 'pending',
      },
    });

    const orderDetails = await Promise.all(cartItems.map(item =>
      prisma.orderDetail.create({
        data: {
          id_order: order.id_order,
          id_product: item.id_product,
          quantity: item.quantity,
          unit_price: item.product.price,
        },
      })
    ));

    await prisma.cart.deleteMany({ where: { id_user } });

    const message = `Nouvelle commande !\nClient: ${id_user}\nTotal: ${total} USD\nProduits:\n${cartItems.map(item => `- ${item.product.name} x${item.quantity} - ${item.product.price} USD`).join('\n')}`;
    const whatsappLink = `https://wa.me/+243902456765?text=${encodeURIComponent(message)}`;

    res.status(201).json({ success: true, message: 'Commande créée avec succès.', order, whatsappLink });
  }, res);
};

// Mettre à jour le statut d'une commande
const updateOrderStatus = async (req, res) => {
  const { id_order } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'canceled', 'delivered', 'returned'];

  await handleTryCatch(async () => {
    if (!validStatuses.includes(status)) {
      throw { code: 400, message: 'Statut invalide.' };
    }

    const order = await prisma.order.update({
      where: { id_order: parseInt(id_order) },
      data: { status },
    });

    res.status(200).json({ success: true, message: `Commande ${status}.`, order });
  }, res);
};

module.exports = { createOrder, updateOrderStatus };
