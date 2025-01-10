export function handleImageSelection(e, imageGrid, fileCount) {
    const files = e.target.files;
    const maxImages = 6;
    const currentImages = imageGrid.children.length;

    if (currentImages + files.length > maxImages) {
        alert('Maximum 6 images allowed');
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload only image files');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${e.target.result}" alt="Package Image" class="company-image">
                <button class="delete-btn">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            
            const img = imageItem.querySelector('img');
            img.file = file;
            
            imageItem.querySelector('.delete-btn').addEventListener('click', function() {
                imageItem.remove();
                const newCount = imageGrid.children.length;
                fileCount.textContent = `${newCount}/6 images uploaded`;
            });
            
            imageGrid.appendChild(imageItem);
            fileCount.textContent = `${imageGrid.children.length}/6 images uploaded`;
        };
        reader.readAsDataURL(file);
    });
} 