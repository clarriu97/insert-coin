document.addEventListener('DOMContentLoaded', () => {
    // Efecto de hover en el joystick
    const joystick = document.querySelector('.joystick');
    
    joystick.addEventListener('mouseover', () => {
        joystick.style.transform = 'scale(1.1)';
    });
    
    joystick.addEventListener('mouseout', () => {
        joystick.style.transform = 'scale(1)';
    });

    // Efecto de presionar botones arcade
    const buttons = document.querySelectorAll('.arcade-button');

    buttons.forEach(button => {
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.9)';
        });
      
        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.transform = 'scale(1)';
        });
    });

    // Efecto de hover en las tarjetas de juegos
    const gameCards = document.querySelectorAll('.game-card');

    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('coming-soon')) {
                alert('¡This game will be available soon!');
            }
        });
    });

    // Añadir efecto de transición al cargar la página
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '1';
});

/* eslint-disable no-unused-vars */
// Función para seleccionar juego
function selectGame(game) {
    // Efecto de transición
    document.body.style.opacity = '0';
    setTimeout(() => {
        window.location.href = `games/${game}/index.html`;
    }, 500);
}