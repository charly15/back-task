const express = require("express");
const bcrypt = require("bcryptjs");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = admin.firestore();


const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ msg: "Acceso denegado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ msg: "Token inválido o expirado" });
  }
};


const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Acceso solo para administradores" });
  }
  next();
};


router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ msg: "Todos los campos son obligatorios" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("USERS").add({
      email,
      username,
      password: hashedPassword,
      role: "user", 
    });

    res.status(201).json({ msg: "Usuario registrado con éxito" });
  } catch (err) {
    res.status(500).json({ msg: "Error en el servidor" });
  }
});

// Inicio de sesión
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: "Todos los campos son obligatorios" });

    const usersRef = db.collection("USERS");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) return res.status(400).json({ msg: "Usuario no encontrado" });

    let user;
    snapshot.forEach((doc) => (user = { id: doc.id, ...doc.data() }));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "10m" }
    );

    res.json({ token, userId: user.id, role: user.role, msg: "Inicio de sesión exitoso" });
  } catch (err) {
    res.status(500).json({ msg: "Error en el servidor", error: err.message });
  }
});


router.get("/admin", authMiddleware, adminMiddleware, (req, res) => {
  res.json({ msg: "Bienvenido, admin" });
});

module.exports = router;
