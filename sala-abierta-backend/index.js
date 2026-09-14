const express = require('express');
const app = express();

const PORT = 3000;

app.use(express.json());

app.get('/api/holamundo', (req, res) => {
    res.json({
        mensaje: "¡Hola Mundo! El backend de SalaAbierta está vivo.",
        estado: "OK",
        desarrollador: "Fernando Pavez"
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});