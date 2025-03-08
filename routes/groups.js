const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");

const router = express.Router();
const db = getFirestore();

router.get("/", async (req, res) => {
  try {
    const groupsRef = db.collection("groups");
    const snapshot = await groupsRef.get();

    if (snapshot.empty) {
      console.log(" No se encontraron grupos.");
      return res.status(404).json({ msg: "No se encontraron grupos en la base de datos" });
    }

    const groups = await Promise.all(snapshot.docs.map(async (doc) => {
      const group = doc.data();
      const creatorRef = db.collection("USERS").doc(group.createdBy);
      const creatorDoc = await creatorRef.get();

      const creatorUsername = creatorDoc.exists ? creatorDoc.data().username : "Creador desconocido";

      return { id: doc.id, ...group, createdByUsername: creatorUsername };
    }));

    console.log("Grupos obtenidos:", groups);
    res.json(groups);
  } catch (error) {
    console.error("Error al obtener los grupos:", error.message);
    res.status(500).json({ error: "Error al obtener los grupos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, members, createdBy, estatus } = req.body;

    if (!name || !description || !members || members.length === 0 || !createdBy || !estatus) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const membersRef = db.collection("USERS");
    const membersData = await Promise.all(
      members.map(async (memberId) => {
        const userDoc = await membersRef.doc(memberId).get();
        if (!userDoc.exists) {
          console.warn(`⚠️ Usuario con ID ${memberId} no encontrado.`);
          return { id: memberId, username: "Usuario no encontrado" };
        }
        return { id: memberId, username: userDoc.data().username };
      })
    );

    const creatorRef = db.collection("USERS").doc(createdBy);
    const creatorDoc = await creatorRef.get();
    const creatorUsername = creatorDoc.exists ? creatorDoc.data().username : "Creador desconocido";

    const newGroup = { 
      name, 
      description, 
      members: membersData, 
      createdBy, 
      createdByUsername: creatorUsername, 
      estatus 
    };

    const docRef = await db.collection("groups").add(newGroup);

    console.log("Grupo creado con éxito:", newGroup);
    res.json({ id: docRef.id, ...newGroup });
  } catch (error) {
    console.error("Error al crear el grupo:", error.message);
    res.status(500).json({ error: "Error al crear el grupo" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const usersRef = db.collection("USERS");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log("⚠️ No se encontraron usuarios.");
      return res.status(404).json({ msg: "No se encontraron usuarios en la base de datos" });
    }

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username || "Username no disponible",
    }));
    console.log("Usuarios obtenidos:", users);
    res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error.message);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Obtener las tareas de un grupo
router.get("/tasks/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.userId; 

    // Verificar si el usuario está en el grupo
    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();
    
    if (!groupDoc.exists) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const groupData = groupDoc.data();
    const isUserInGroup = groupData.members.some(member => member.id === userId);
    
    if (!isUserInGroup) {
      return res.status(403).json({ error: "No tienes acceso a este grupo" });
    }

    // Obtener las tareas del grupo
    const tasksRef = groupRef.collection("tasks");
    const snapshot = await tasksRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "No hay tareas en este grupo" });
    }

    const tasks = snapshot.docs.map(doc => {
      const task = doc.data();
      return {
        id: doc.id,
        ...task,
        canEdit: task.assignedTo.includes(userId) && task.status !== 'completada',  // El usuario solo puede editar si está asignado y no está completada
      };
    });

    res.json(tasks);
  } catch (error) {
    console.error("Error al obtener tareas:", error.message);
    res.status(500).json({ error: "Error al obtener las tareas" });
  }
});

// Crear tarea en el grupo
router.post("/tasks/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, description, assignedTo, status } = req.body;

    if (!title || !assignedTo || !status) {
      return res.status(400).json({ error: "Título, asignados y estatus son obligatorios" });
    }

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const task = {
      title,
      description,
      assignedTo,
      status,
    };

    const taskRef = groupRef.collection("tasks");
    const docRef = await taskRef.add(task);

    console.log("Tarea creada con éxito:", task);
    res.json({ id: docRef.id, ...task });
  } catch (error) {
    console.error("Error al crear la tarea:", error.message);
    res.status(500).json({ error: "Error al crear la tarea" });
  }
});

// 🔹 ACTUALIZAR ESTATUS DE UN GRUPO 🔹
router.put("/:groupId/status", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { estatus } = req.body;

    if (!estatus) {
      return res.status(400).json({ error: "El nuevo estatus es obligatorio" });
    }

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    await groupRef.update({ estatus });

    res.json({ message: "Estatus del grupo actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el estatus del grupo:", error.message);
    res.status(500).json({ error: "Error al actualizar el estatus del grupo" });
  }
});


module.exports = router;
