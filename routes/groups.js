const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");

const router = express.Router();
const db = getFirestore();

router.get("/", async (req, res) => {
  try {
    const groupsRef = db.collection("groups");
    const snapshot = await groupsRef.get();

    if (snapshot.empty) {
      console.log("⚠️ No se encontraron grupos.");
      return res.status(404).json({ msg: "No se encontraron grupos en la base de datos" });
    }

    const groups = await Promise.all(snapshot.docs.map(async (doc) => {
      const group = doc.data();
      const creatorRef = db.collection("USERS").doc(group.createdBy); 
      const creatorDoc = await creatorRef.get();

      const creatorUsername = creatorDoc.exists ? creatorDoc.data().username : "Creador desconocido";

      return { id: doc.id, ...group, createdByUsername: creatorUsername };
    }));

    console.log(" Grupos obtenidos:", groups);
    res.json(groups);
  } catch (error) {
    console.error(" Error al obtener los grupos:", error.message);
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

    console.log(" Grupo creado con éxito:", newGroup);
    res.json({ id: docRef.id, ...newGroup });
  } catch (error) {
    console.error(" Error al crear el grupo:", error.message);
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
    console.log(" Usuarios obtenidos:", users);
    res.json(users);
  } catch (error) {
    console.error(" Error al obtener usuarios:", error.message);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

router.get("/realtime/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const groupRef = db.collection("groups").doc(groupId);

    groupRef.onSnapshot((doc) => {
      if (doc.exists) {
        const groupData = doc.data();
        console.log("Grupo actualizado en tiempo real:", groupData);
        res.json(groupData);
      } else {
        console.log("⚠️ El grupo no existe.");
        res.status(404).json({ msg: "Grupo no encontrado" });
      }
    });

  } catch (error) {
    console.error("Error al escuchar el grupo en tiempo real:", error.message);
    res.status(500).json({ error: "Error al escuchar el grupo en tiempo real" });
  }
});

router.put("/update-task", async (req, res) => {
  try {
    const { groupId, taskId, newStatus } = req.body;

    if (!groupId || !taskId || !newStatus) {
      return res.status(400).json({ error: "Faltan parámetros necesarios" });
    }

    const taskRef = db.collection("groups").doc(groupId).collection("tasks").doc(taskId);
    await taskRef.update({ status: newStatus });

    console.log("Estado de la tarea actualizado con éxito.");
    res.json({ message: "Tarea actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la tarea:", error.message);
    res.status(500).json({ error: "Error al actualizar la tarea" });
  }
});

module.exports = router;
