document.addEventListener('DOMContentLoaded', () => {
    const noteTitle = document.getElementById('note-title');
    const noteImage = document.getElementById('note-image');
    const noteAudio = document.getElementById('note-audio');
    const noteContent = document.getElementById('note-content');
    const noteAttachments = document.getElementById('note-attachments');
    const themeToggle = document.getElementById('theme-toggle');
    const header = document.getElementById('header');
    const mainContent = document.getElementById('main-content');
    const footer = document.querySelector('footer');
    const similarNotesGrid = document.getElementById('similar-notes-grid');

    header.style.display = 'block';
    mainContent.style.display = 'block';
    footer.style.display = 'block';

    if (localStorage.getItem('darkTheme') === 'true') {
        document.body.classList.add('dark-theme');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
        updatePlyrTheme();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');

    // Sonido de clic
    const clickSound = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');

    fetch('notes.json')
        .then(response => response.json())
        .then(data => {
            const note = data.find(n => n.id == noteId);
            if (note) {
                noteTitle.textContent = note.title;
                noteImage.src = note.image;
                noteContent.textContent = note.content;

                // Manejo de audio con Plyr
                const audioAttachment = note.attachments?.find(att => att.type === 'audio');
                if (audioAttachment) {
                    // Título del audio con duración
                    if (audioAttachment.name) {
                        const audioTitle = document.createElement('p');
                        audioTitle.className = 'audio-title';
                        noteAudio.appendChild(audioTitle);
                    }

                    // Botón de play personalizado con SVG
                    const playButton = document.createElement('button');
                    playButton.innerHTML = `
                        <svg class="play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <svg class="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                            <rect x="6" y="4" width="4" height="16"/>
                            <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                    `;
                    playButton.className = 'custom-play-button';
                    noteAudio.appendChild(playButton);

                    // Reproductor Plyr
                    const audioElement = document.createElement('audio');
                    audioElement.id = 'plyr-audio';
                    audioElement.src = audioAttachment.url;
                    audioElement.preload = 'auto';
                    noteAudio.appendChild(audioElement);

                    const player = new Plyr('#plyr-audio', {
                        controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
                        invertTime: false,
                        volume: 0.5,
                    });

                    // Actualizar título con duración
                    audioElement.addEventListener('loadedmetadata', () => {
                        const duration = formatTime(audioElement.duration);
                        noteAudio.querySelector('.audio-title').textContent = `${audioAttachment.name} (${duration})`;
                    });

                    playButton.addEventListener('click', () => {
                        clickSound.play();
                        player.play();
                    });

                    // Indicador de reproducción con pulsación
                    player.on('playing', () => {
                        playButton.classList.add('playing');
                        playButton.querySelector('.play-icon').style.display = 'none';
                        playButton.querySelector('.pause-icon').style.display = 'block';
                    });
                    player.on('pause', () => {
                        playButton.classList.remove('playing');
                        playButton.querySelector('.play-icon').style.display = 'block';
                        playButton.querySelector('.pause-icon').style.display = 'none';
                    });

                    // Ajustar tema de Plyr según el tema actual
                    updatePlyrTheme();
                }

                // Manejo de otros adjuntos (imágenes)
                note.attachments?.filter(att => att.type === 'image').forEach(attachment => {
                    const imgElement = document.createElement('img');
                    imgElement.src = attachment.url;
                    imgElement.alt = 'Adjunto';
                    noteAttachments.appendChild(imgElement);
                });

                renderSimilarNotes(data, note);
            } else {
                noteContent.textContent = 'Nota no encontrada.';
            }
        })
        .catch(error => {
            console.error('Error cargando nota:', error);
            noteContent.textContent = 'Error al cargar la nota.';
        });

    function renderSimilarNotes(allNotes, currentNote) {
        similarNotesGrid.innerHTML = '';
        const currentTags = currentNote.tags || [];
        const similarNotes = allNotes
            .filter(n => n.id != currentNote.id)
            .filter(n => n.tags && n.tags.some(tag => currentTags.includes(tag)))
            .slice(0, 3);

        if (similarNotes.length === 0) {
            similarNotesGrid.innerHTML = '<p>No hay notas similares disponibles.</p>';
            return;
        }

        similarNotes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'similar-note-item';
            noteItem.innerHTML = `
                <a href="note.html?id=${note.id}" aria-label="${note.title}">
                    <img src="${note.image}" alt="${note.title}">
                    <h3>${note.title}</h3>
                </a>
            `;
            similarNotesGrid.appendChild(noteItem);
        });
    }

    function updatePlyrTheme() {
        const plyrControls = document.querySelector('.plyr__controls');
        if (plyrControls) {
            if (document.body.classList.contains('dark-theme')) {
                plyrControls.style.background = '#b71c1c';
            } else {
                plyrControls.style.background = '#d32f2f';
            }
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
});