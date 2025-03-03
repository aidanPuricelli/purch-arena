import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit{
  selectedElement: HTMLElement | null = null;
  hideTimeout: any;
    
  uploadedImage: string | null = null; // Store the uploaded image URL

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  fontClasses = ['mplantin-italic', 'beleren-bold', 'mplantin-text']; // Font classes
  symbols: string[] = []; // Array to store symbol images

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchSymbols();
  }

  fetchSymbols() {
    this.symbols = [
      '../../assets/symbols-png/W.png', // White mana
      '../../assets/symbols-png/U.png', // Blue mana
      '../../assets/symbols-png/B.png', // Black mana
      '../../assets/symbols-png/R.png', // Red mana
      '../../assets/symbols-png/G.png', // Green mana
      '../../assets/symbols-png/1.png', // Colorless mana
      '../../assets/symbols-png/2.png', // Colorless mana
      '../../assets/symbols-png/3.png', // Colorless mana
      '../../assets/symbols-png/4.png', // Colorless mana
      '../../assets/symbols-png/5.png', // Colorless mana
      '../../assets/symbols-png/T.png' // Tap symbol
    ];
  }
  
  
  

  showTextOptions(event: FocusEvent) {
    this.selectedElement = event.target as HTMLElement;
  }

  applyFontClass(className: string) {
    if (!this.selectedElement) return;

    // Remove any existing font class
    this.fontClasses.forEach(cls => this.selectedElement?.classList.remove(cls));

    // Insert a new styled span at the cursor position
    document.execCommand("insertHTML", false, `<span class="${className}">\u200B</span>`);
  }

  toggleItalic(event: Event) {
    event.preventDefault();
    this.applyFontClass("mplantin-italic");
  }

  toggleBold(event: Event) {
    event.preventDefault();
    this.applyFontClass("beleren-bold");
  }

  applyEmptySetFont(event: Event) {
    event.preventDefault();
    this.applyFontClass("mplantin-text");
  }

  insertSymbol(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (!target) return;
  
    const symbolUrl = target.value;
    if (!this.selectedElement || !symbolUrl) return;
  
    const span = document.createElement('span');
    span.classList.add('inline-symbol');
  
    const imgElement = new Image();
    imgElement.src = symbolUrl;
    imgElement.classList.add('mtg-symbol');
    imgElement.alt = 'Symbol';
    imgElement.style.width = "22px";
    imgElement.style.height = "22px";
    imgElement.crossOrigin = "anonymous"; // Ensures CORS compatibility for html2canvas
  
    imgElement.onload = () => {
      span.appendChild(imgElement);
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        
        range.setStartAfter(span);
        range.setEndAfter(span);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    };
  
    target.value = "";
  }
  
  
  saveCustomCard() {
    const cardElement = document.getElementById('card-container');
    if (!cardElement) {
      console.error("Card container not found!");
      return;
    }
  
    // Ensure all images are loaded before capturing
    const images = Array.from(cardElement.getElementsByTagName('img'));
    let loadedImages = 0;
  
    const checkImagesLoaded = () => {
      loadedImages++;
      if (loadedImages === images.length) {
        // All images are loaded, capture the card
        this.captureAndSaveCard(cardElement);
      }
    };
  
    images.forEach(img => {
      if (img.complete) {
        checkImagesLoaded();
      } else {
        img.onload = checkImagesLoaded;
        img.onerror = () => console.error("Error loading image:", img.src);
      }
    });
  
    // If all images were already loaded, capture immediately
    if (images.length === 0) {
      setTimeout(() => {
        this.captureAndSaveCard(cardElement);
      }, 500); // Give time for the DOM to fully render      
    }
  }
  
  captureAndSaveCard(cardElement: HTMLElement) {
    // Ensure a repaint before capturing
    setTimeout(() => {
      html2canvas(cardElement, {
        useCORS: true,
        scale: 2, // High-resolution capture
        backgroundColor: null, // Ensure transparency if needed
        foreignObjectRendering: false // Ensures proper HTML rendering
      }).then(canvas => {
        const imageData = canvas.toDataURL('image/png'); // Convert canvas to Base64 PNG
  
        const cardName = (document.querySelector('.card-text.name p')?.textContent || 'custom_card').trim();
        
        this.http.post('/api/save-custom-card', { 
          name: cardName, 
          image: imageData 
        }).subscribe(
          (response: any) => {
            console.log('Card saved successfully:', response);
            alert('Card saved successfully!');
          },
          (error) => {
            console.error('Error saving card:', error);
            alert('Failed to save card.');
          }
        );
      });
    }, 300); // Small delay to force repaint
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.uploadedImage = reader.result as string; // Set the uploaded image
    };

    reader.readAsDataURL(file); // Convert image to Base64
  }
}

/* 
TODO:
- allow user configure image position/zoom
- reformat UI (options, image upload, save button)
*/
