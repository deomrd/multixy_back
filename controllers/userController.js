const bcrypt = require('bcryptjs');
const { sendErrorMessage } = require('../services/errorService');
const { handleTryCatch } = require('../services/tryCatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fonction pour récupérer tous les utilisateurs non supprimés
const getAllUsers = async (req, res) => {
  await handleTryCatch(async () => {
    const users = await prisma.user.findMany({
      where: { is_deleted: false }, // Exclut les utilisateurs supprimés
      include: {
        orders: true,
        cart: true,
        productReviews: true,
        wishlist: true,
        supportMessages: true,
        administrator: true,
      },
    });

    res.status(200).json(users);
  }, res);
};

// Fonction pour récupérer un utilisateur par son ID, avec ses relations (commandes, panier, etc.)
const getUserById = async (req, res) => {
  const { id } = req.params;

  await handleTryCatch(async () => {
    const user = await prisma.user.findUnique({
      where: { id_user: parseInt(id) },
      include: {
        orders: true,
        cart: true,
        productReviews: true,
        wishlist: true,
        supportMessages: true,
        administrator: true,
      },
    });

    if (!user) {
      throw { code: 404, message: "Utilisateur non trouvé." };
    }

    res.status(200).json(user);
  }, res);
};

// Fonction pour créer un nouvel utilisateur
const createUser = async (req, res) => {
  const { first_name, last_name, email, password, address, phone, role } = req.body;

  await handleTryCatch(async () => {
    if (!first_name || !last_name || !email || !password) {
      throw { code: 400, message: 'Les champs requis (prénom, nom, email, mot de passe) sont obligatoires' };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw { code: 400, message: 'Un utilisateur avec cet email existe déjà' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        address,
        phone,
        role,
      },
    });

    res.status(201).json({ success: true, message: 'Utilisateur créé avec succès', user: newUser });
  }, res);
};

// Fonction pour mettre à jour un utilisateur
const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, password, address, phone, role } = req.body;

  await handleTryCatch(async () => {
    const user = await prisma.user.findUnique({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw { code: 404, message: 'Utilisateur non trouvé' };
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const updatedUser = await prisma.user.update({
      where: { id_user: Number(userId) },
      data: {
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        email: email || user.email,
        password: hashedPassword || user.password,
        address: address || user.address,
        phone: phone || user.phone,
      },
    });

    res.status(200).json({ success: true, message: 'Utilisateur mis à jour avec succès', user: updatedUser });
  }, res);
};

// Fonction pour supprimer un utilisateur (soft delete)
const deleteUser = async (req, res) => {
  const userId = req.params.id;

  await handleTryCatch(async () => {
    const user = await prisma.user.findUnique({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw { code: 404, message: 'Utilisateur non trouvé' };
    }

    const deletedUser = await prisma.user.update({
      where: { id_user: Number(userId) },
      data: { is_deleted: true },
    });

    res.status(200).json({ success: true, message: 'Utilisateur supprimé avec succès', user: deletedUser });
  }, res);
};

// Mettre a jour le mot de passe
const updatePasswordUser = async (req, res) => {
  const userId = req.params.id;
  const { oldPassword, newPassword } = req.body;

  await handleTryCatch(async () => {
    // Vérification que les deux mots de passe sont fournis
    if (!oldPassword || !newPassword) {
      throw { code: 400, message: 'L\'ancien et le nouveau mot de passe sont requis' };
    }

    // Récupérer l'utilisateur à partir de l'ID
    const user = await prisma.user.findUnique({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw { code: 404, message: 'Utilisateur non trouvé' };
    }

    // Vérification que l'ancien mot de passe est correct
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw { code: 400, message: 'L\'ancien mot de passe est incorrect' };
    }

    // Hacher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Mise à jour du mot de passe avec le nouveau mot de passe
    const updatedUser = await prisma.user.update({
      where: { id_user: Number(userId) },
      data: {
        password: hashedNewPassword,
      },
    });

    res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès', user: updatedUser });
  }, res);
};


module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updatePasswordUser,
};
