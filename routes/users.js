
const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");

const router = express.Router();
const db = getFirestore();

router.get("/users", async (req, res) => {
  try {
    const usersRef = db.collection("USERS");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ msg: "No se encontraron usuarios en la base de datos" });
    }

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(users);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error.message);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

router.put("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const userRef = db.collection("USERS").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userData = userDoc.data();
    const currentRole = userData.role;

    // Verificar si ya existe un administrador
    if (role === "admin" && currentRole !== "admin") {
      const adminCount = (await db.collection("USERS").where("role", "==", "admin").get()).size;

      if (adminCount >= 1) {
        return res.status(400).json({ error: "Ya existe un administrador" });
      }
    }

    await userRef.update({ role });

    res.json({ msg: "Rol actualizado correctamente", role });
  } catch (error) {
    console.error("Error al actualizar el rol:", error.message);
    res.status(500).json({ error: "Error al actualizar el rol" });
  }
});

module.exports = router;
