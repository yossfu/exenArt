<?php

// Función para agregar una nueva imagen al archivo JSON
function agregarImagenJson($id, $url, $title, $description, $tags, $redirectUrl, $jsonFile) {
    // Lee el contenido actual del archivo JSON
    $jsonString = file_get_contents($jsonFile);
    $data = json_decode($jsonString, true);

    // Si el archivo está vacío o no contiene un array, inicializa un array vacío
    if ($data === null) {
        $data = [];
    }

    // Crea el nuevo elemento
    $newImage = [
        "id" => $id,
        "url" => $url,
        "title" => $title,
        "description" => $description,
        "tags" => $tags,
        "redirectUrl" => $redirectUrl
    ];

    // Agrega el nuevo elemento al array
    $data[] = $newImage;

    // Convierte el array de nuevo a JSON
    $newJsonString = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    // Escribe el nuevo JSON de nuevo al archivo
    if (file_put_contents($jsonFile, $newJsonString)) {
        return true;
    } else {
        return false;
    }
}

// Función para generar el archivo HTML
function generarHtml($id, $url, $title, $description, $jsonFile) {
    $html = "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>$title</title>
        <style>
            * {
                box-sizing: border-box;
            }

            body { 
                font-family: Arial, sans-serif; 
                background-color: #121212; 
                color: #e0e0e0; 
                margin: 0; 
                display: flex;
                flex-direction: column;
                align-items: center;
            } 

            header { 
                background-color: #1f1f1f; 
                padding: 10px; 
                width: 100%;
            } 

            .top-bar { 
                display: flex; 
                align-items: center; 
            } 

            .header-icon { 
                width: 30px; 
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
            } 

            .image-title-container { 
                text-align: center; 
                margin-top: 20px; 
            } 

            .full-image { 
                max-width: 100%;
                height: auto;  
            } 

            .description-container { 
                text-align: center; 
                margin-top: 10px;  
            } 

            .comments-container { 
                margin-top: 20px;  
                text-align: center;
                width: 100%;
            } 

            .comments-container h3 {
                margin-bottom: 10px;
            }

            .utterances {
                max-width: 800px;
                margin-left: auto;
                margin-right: auto;
            }

            .similar-images-container { 
                margin-top: 20px;  
                text-align: center;  
            } 

            #similar-images-grid { 
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
            } 

            .similar-image-item { 
                 text-align: center;
                 border-radius: 5px;
                 overflow: hidden;
                 background-color: #222;
                 padding: 5px;
                 transition: transform 0.3s ease-in-out;
             } 

             .similar-image-item:hover {
                 transform: scale(1.05);
             }

             .similar-image-item img { 
                 width: 100%;
                 height: auto;
             } 

             footer { 
                 text-align: center;  
                 padding: 20px;
                 background-color: #1f1f1f;
                 position: relative;
                 bottom: 0;
                 width: 100%;
             } 

        </style>  
    </head>  
    <body>  

    <header>  
       <div class='top-bar'>  
           <img src='https://i.ibb.co/Fnt08ty/Exen-Profil-E.jpg' alt='Icono' class='header-icon'>  
           <nav class='menu'>  
               <a href='index.html' class='tab-button'>Home</a>  
               <a href='chat.html' class='tab-button'>Chat</a>  
               <a href='yo.html' class='tab-button'>Sobre mí</a>  
           </nav>  
       </div>  
       <hr class='divider'>  
    </header>  

    <div class='image-title-container'>  
       <h2 id='image-title'></h2>  
       <img id='full-image' src='$url' alt='$title' class='full-image'>  
    </div>  

    <hr class='divider'>  

    <div class='description-container'>  
       <p id='image-description'>$description</p>  
    </div>  

    <hr class='divider'>  

    <div class='comments-container'>  
       <h3>Comentarios:</h3>  
       <div class='utterances'>
           <script src='https://utteranc.es/client.js' repo='yossfu/Gesti-n-de-comentarios' issue-term='pathname' theme='dark-blue' crossorigin='anonymous' async></script>
       </div>
    </div>  

    <hr class='divider'>  

    <div class='similar-images-container'>  
       <h3>Imágenes Similares:</h3>  
       <div id='similar-images-grid'></div>
    </div>  

    <hr class='divider'>  

    <footer>   
       <p>&copy; 2024 exenE. Todos los derechos reservados.</p>   
    </footer>   

    <script>
    // Define el ID de la imagen que quieres cargar
    const imageId = $id; // Cambia este número al ID correspondiente

    fetch('$jsonFile')
       .then(response => response.json())
       .then(data => {
           const currentItem = data.find(img => img.id == imageId);
           if (currentItem) {
               // Mostrar título e imagen
               document.getElementById('image-title').textContent = currentItem.title;
               document.getElementById('full-image').src = currentItem.url;

               // Mostrar descripción
               document.getElementById('image-description').textContent = currentItem.description;

               // Cargar imágenes similares
               loadSimilarImages(currentItem.tags, data);
           } else {
               console.error('Imagen no encontrada');
           }
       })
       .catch(err => console.error(`Fetch problem:${err.message}`));

    function loadSimilarImages(tags, allImages) {
       const similarImagesGrid = document.getElementById('similar-images-grid');
       let count = 0; // Contador para las imágenes similares
       allImages.forEach(item => {
           if (item.id !== imageId && item.tags.some(tag => tags.includes(tag))) { // Filtrar imágenes similares
               if (count < 8) { // Limitar a un máximo de 8 imágenes
                   const imageElement = document.createElement('div');
                   imageElement.className = 'similar-image-item';
                   imageElement.innerHTML = `
                       <a href='${item.redirectUrl}'>
                           <img src='${item.url}' alt='${item.title}'>
                       </a>
                       <p>${item.title}</p>`;
                   similarImagesGrid.appendChild(imageElement);
                   count++; // Incrementar contador
               }
           }
       });
    }
    </script>

    </body>
    </html>";

    // Guarda el archivo HTML con el nombre del archivo cargado
    $filename = basename($url, ".webp");
    $file =  "$filename.html";
    if (file_put_contents($file, $html)) {
        return $file;
    } else {
        return false;
    }
}

// Datos de la nueva imagen (esto vendría de un formulario, por ejemplo)
$id = $_POST['id'];
$url = $_POST['url'];
$title = $_POST['title'];
$description = $_POST['description'];
$tags = explode(",", $_POST['tags']); // Convertir la cadena de tags en un array
$redirectUrl = $_POST['redirectUrl'];

// Nombre del archivo JSON
$jsonFile = 'imagenes.json';

// Agrega la nueva imagen al archivo JSON
if (agregarImagenJson($id, $url, $title, $description, $tags, $redirectUrl, $jsonFile)) {
    echo "Imagen agregada correctamente al archivo JSON.<br>";

    // Genera el archivo HTML
    $htmlFile = generarHtml($id, $url, $title, $description, $jsonFile);

    if ($htmlFile) {
        echo "Archivo HTML generado correctamente: <a href='$htmlFile'>$htmlFile</a>";
    } else {
        echo "Error al generar el archivo HTML.";
    }
} else {
    echo "Error al agregar la imagen al archivo JSON.";
}

?>
