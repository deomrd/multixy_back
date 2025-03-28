const { sendErrorMessage } = require('../services/errorService');
const { handleTryCatch } = require('../services/tryCatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); 



// Fonction pour récupérer toutes les catégories
const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        is_deleted: false, // Filtrer les catégories non supprimées
      },
    });

    // Ajouter une catégorie "Tous" au début de la liste
    const allCategory = { id_category: 0, name: 'Tous' };
    categories.unshift(allCategory); // Ajoute "Tous" au début de la liste

    res.status(200).json(categories); // Retourne la liste des catégories
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};



// recuperer l'ID de la categorie
const getCategoryById = async (req, res) => {
  const { id } = req.params; 

  await handleTryCatch(async () => {
    
    const category = await prisma.category.findUnique({
      where: { id_category: parseInt(id) }, 
    });

    // Si la categorie n'est pas trouvé, on renvoie une erreur 404
    if (!category) {
      throw { code: 404, message: "Catégorie non trouvée." };
    }

    res.status(200).json(category);
  }, res);
};

const createCategory = async (req, res) => {
  const { name, description } = req.body;

  await handleTryCatch(async () => {
    // Vérification des champs obligatoires
    if (!name) {
      throw { code: 400, message: "Le champ 'name' est obligatoire" };
    }

    // Vérification si le nom de la catégorie existe déjà
    const existingCategory = await prisma.category.findFirst({
      where: { name },
    });

    if (existingCategory) {
      throw { code: 400, message: "Une catégorie avec ce nom existe déjà" };
    }

    // Création de la catégorie
    const newCategory = await prisma.category.create({
      data: { name, description: description || null },
    });

    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès",
      category: newCategory,
    });
  }, res);
};


// Fonction pour mettre à jour une categorie
const updateCategory = async (req, res) => {
  const categoryId = Number(req.params.id); // Conversion en nombre
  const { name, description } = req.body; 
  
  await handleTryCatch(async () => {
    // Vérification si l'ID est valide
    if (isNaN(categoryId)) {
      throw { code: 400, message: "ID de catégorie invalide" };
    }

    // Recherche de la catégorie à mettre à jour
    const category = await prisma.category.findUnique({
      where: { id_category: categoryId },
    });

    if (!category) {
      throw { code: 404, message: "Catégorie non trouvée" };
    }

    // Vérification si des données sont envoyées pour mise à jour
    if (!name && !description) {
      throw { code: 400, message: "Aucune donnée à mettre à jour" };
    }

    // Mise à jour de la catégorie
    const updatedCategory = await prisma.category.update({
      where: { id_category: categoryId },
      data: {
        name: name || category.name,
        description: description || category.description,
      },
    });

    res.status(200).json({
      success: true,
      message: "Catégorie mise à jour avec succès",
      category: updatedCategory,
    });
  }, res);
};


// Fonction pour supprimer un utilisateur 
const deleteCategory = async (req, res) => {
  const categoryId = req.params.id;

  await handleTryCatch(async () => {
    const category = await prisma.category.findUnique({
      where: { id_category: Number(categoryId) },
    });

    if (!category) {
      throw { code: 404, message: 'Catégorie non trouvée' };
    }

    // Soft delete : On marque l'utilisateur comme supprimé
    const deletedCategory = await prisma.category.update({
      where: { id_category: Number(categoryId) },
      data: {
        is_deleted: true,
      },
    });

    res.status(200).json({ success: true, message: 'Catégorie supprimée avec succès', category: deletedCategory });
  }, res);
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
