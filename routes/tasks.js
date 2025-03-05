const express = require("express");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

router.post("/tasks", async (req, res) => {
  try {
    const { userId, name, description, timeUntilFinish, category, status } = req.body;

    if (!userId || !name || !description || !timeUntilFinish || !category || !status) {
      return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    console.log(" Creando tarea para el usuario:", userId);

    const userRef = db.collection("USERS").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(" Usuario no encontrado en la base de datos.");
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const taskRef = await userRef.collection("TASKS").add({
      name,
      description,
      timeUntilFinish,
      category,
      status,
      createdAt: new Date(),
    });

    console.log("Tarea creada con ID:", taskRef.id);

    res.status(201).json({ msg: "Tarea creada exitosamente", taskId: taskRef.id });
  } catch (err) {
    console.error(" Error en /tasks:", err.message);
    res.status(500).json({ msg: "Error en el servidor", error: err.message });
  }
});

router.get("/tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(" Obteniendo tareas para el usuario:", userId);

    const userRef = db.collection("USERS").doc(userId);
    const tasksSnapshot = await userRef.collection("TASKS").get();

    if (tasksSnapshot.empty) {
      console.log(" No se encontraron tareas para el usuario.");
      return res.json({ tasks: [] });
    }

    let tasks = [];
    tasksSnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    console.log(" Tareas obtenidas:", tasks.length);
    res.json({ tasks });
  } catch (err) {
    console.error(" Error en /tasks/:userId:", err.message);
    res.status(500).json({ msg: "Error en el servidor", error: err.message });
  }
});

router.put("/tasks/:userId/:taskId", async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { name, description, timeUntilFinish, category, status } = req.body;

    console.log(` Actualizando tarea ${taskId} del usuario ${userId}`);

    const taskRef = db.collection("USERS").doc(userId).collection("TASKS").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      console.log(" Tarea no encontrada en la base de datos.");
      return res.status(404).json({ msg: "Tarea no encontrada" });
    }

    await taskRef.update({ name, description, timeUntilFinish, category, status });

    console.log(" Tarea actualizada correctamente");
    res.json({ msg: "Tarea actualizada correctamente" });
  } catch (error) {
    console.error(" Error al actualizar tarea:", error.message);
    res.status(500).json({ msg: "Error en el servidor", error: error.message });
  }
});

router.delete("/tasks/:userId/:taskId", async (req, res) => {
  try {
    const { userId, taskId } = req.params;

    console.log(` Eliminando tarea ${taskId} del usuario ${userId}`);

    const taskRef = db.collection("USERS").doc(userId).collection("TASKS").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      console.log(" Tarea no encontrada en la base de datos.");
      return res.status(404).json({ msg: "Tarea no encontrada" });
    }

    await taskRef.delete();

    console.log(" Tarea eliminada correctamente");
    res.json({ msg: "Tarea eliminada correctamente" });
  } catch (error) {
    console.error(" Error al eliminar tarea:", error.message);
    res.status(500).json({ msg: "Error en el servidor", error: error.message });
  }
});

module.exports = router;
