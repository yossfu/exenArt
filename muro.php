<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galería de Imágenes - Muro</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #121212;
            color: #e0e0e0;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        header {
            background-color: #1f1f1f;
            padding: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        }

        .top-bar {
            display: flex;
            align-items: center;
        }

        .header-icon {
            width: 40px;
            height: auto;
            border-radius: 50%;
        }

        .menu {
            display: flex;
            margin-left: 20px;
        }

        .tab-button {
            color: white;
            padding: 10px;
            text-decoration: none;
            transition: background-color 0.3s;
        }

        .tab-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .muro-title {
            text-align: center; /* Centrar el texto */
            font-size: 24px; /* Tamaño de fuente */
            margin: 20px 0; /* Margen superior e inferior */
        }

        .wall-container {
           max-width :1200px; 
           margin :auto; 
           padding :20px; 
           display:flex; 
           flex-direction :column; /* Colocar elementos en columna */
           gap :20px; /* Espacio entre los elementos */
       } 

       .post { 
           background-color:#222; 
           border-radius :5px; 
           overflow:hidden; 
           position: relative; /* Para posicionar el texto sobre la imagen */
           padding :10px; /* Espaciado interno */
           transition :transform 0.3s ease-in-out; 
       } 

       .post:hover { 
           transform :scale(1.02); /* Efecto zoom al pasar el mouse sobre el post */ 
       } 

       .post img { 
           width :100%; 
           height :auto; 
       } 

       .chat-bubble {
           position:absolute; /* Posicionar la burbuja sobre la imagen */
           bottom:30px; /* Ubicación desde abajo */
           left:10px; /* Ubicación desde la izquierda */
           background-color:rgba(31,31,31,0.8); /* Color de fondo translúcido para la burbuja */
           color:white; /* Color del texto */
           padding:10px; /* Espaciado interno de la burbuja */
           border-radius:10px; /* Bordes redondeados para la burbuja */
           max-width: calc(100% - 20px); /* Ancho máximo de la burbuja */
       }

       .load-more,
       .load-previous {
           margin-top: 20px;
           padding: 10px 20px;
           background-color: #ff5722; /* Color de fondo del botón */
           color:white; /* Color del texto */
           border:none; /* Sin borde */
           border-radius:5px; /* Bordes redondeados */
           cursor:pointer; /* Cambiar cursor al pasar sobre el botón */
           transition: background-color 0.3s, opacity 0.3s ease-in-out; /* Transición suave para el hover y opacidad */
       }

       .load-more:hover,
       .load-previous:hover {
           background-color:#e64a19; /* Color más oscuro al pasar el mouse */
       }

       footer { 
           text-align:center; 
           padding :20px; 
           background-color:#1f1f1f; 
       }

       .button-container {
           text-align:center; /* Centrar los botones */
       }
    </style>
</head>
<body>

<header>
    <div class="top-bar">
        <img src="https://i.ibb.co/Fnt08ty/Exen-Profil-E.jpg" alt="Icono" class="header-icon">
        <nav class="menu">
            <a href="index.html" class="tab-button">Home</a>
            <a href="https://html5-chat.com/chat/51441/67647612ece05" class="tab-button">Chat</a>
            <a href="yo.html" class="tab-button">Sobre mí</a>
        </nav>
    </div>
    <hr class="divider">
</header>

<div class="muro-title">Muro</div> <!-- Título centrado -->

<main id="gallery" class="wall-container">
    <!-- Contenedor para el muro -->
</main>

<div class="button-container">
    <button id="loadPreviousBtn" class="load-previous">Cargar anteriores</button> <!-- Botón para cargar publicaciones anteriores -->
</div>

<div class="button-container">
    <button id="loadMoreBtn" class="load-more">Cargar más publicaciones</button> <!-- Botón para cargar más publicaciones -->
</div>

<footer>
    <p>&copy; 2024 ExenE. Todos los derechos reservados.</p>
</footer>

<script>
// Cargar datos JSON desde un archivo externo
let currentPage = 1;
const itemsPerPage = 5;

fetch('imagenes.json')
   .then(response => response.json())
   .then(imagesData => {
       const wallContainer = document.getElementById('gallery');

       // Ordenar las imágenes por fecha (suponiendo que hay un campo 'date' en el JSON)
       imagesData.sort((a, b) => new Date(b.date) - new Date(a.date));

       function renderImages() {
           // Limpiar el contenedor
           wallContainer.innerHTML = '';

           // Calcular los índices de inicio y fin
           const startIndex = (currentPage - 1) * itemsPerPage;
           const endIndex = startIndex + itemsPerPage;

           // Renderizar imágenes limitadas por página
           imagesData.slice(startIndex, endIndex).forEach(item => {
               const post = document.createElement('div');
               post.className = 'post';
               post.innerHTML = `
                   <a href="${item.redirectUrl}">
                       <img src="${item.url}" alt="${item.title}">
                   </a>
                   <div class="chat-bubble">
                       ${item.postText}
                   </div> <!-- Mostrar el texto de la publicación -->
               `;
               wallContainer.appendChild(post); // Agregar el post al muro
           });

           // Si ya se han mostrado todas las imágenes, ocultar el botón "Cargar más"
           if (endIndex >= imagesData.length) {
               document.getElementById('loadMoreBtn').style.display = 'none';
               document.getElementById('loadPreviousBtn').style.display = 'none'; // Ocultar también si no hay más publicaciones
           }
       }

       // Renderizar las imágenes al cargar
       renderImages();

      // Manejar clic en "Cargar más"
      document.getElementById('loadMoreBtn').addEventListener('click', function() {
          currentPage++;
          renderImages();
      });

      // Manejar clic en "Cargar anteriores"
      document.getElementById('loadPreviousBtn').addEventListener('click', function() {
          if (currentPage > 1) { // Solo permitir si hay páginas anteriores
              currentPage--;
              renderImages();
              window.scrollTo({ top: 0, behavior: 'smooth' }); // Desplazar suavemente hacia arriba
          }
      });

   })
   .catch(error => console.error('Error cargando el JSON:', error));

</script>

</body>
</html>
