import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface PlayedCard {
  card: any;
  x: number;
  y: number;
  tapped?: boolean;  // Indicates tapped state.
}

@Component({
  selector: 'app-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.css']
})
export class PlayComponent implements OnInit {

  deck: any[] = [];
  hand: any[] = [];
  graveyard: any[] = [];
  exile: any[] = [];

  // Cards placed in the play area.
  playCards: PlayedCard[] = [];

  // Temporary storage for the card being dragged.
  draggedCard: any = null;
  draggedSource: 'hand' | 'play' | null = null;

  // Context menu for hand cards.
  contextMenuVisible: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  selectedCard: any = null;

  // Context menu for play area cards.
  playContextMenuVisible: boolean = false;
  playContextMenuX: number = 0;
  playContextMenuY: number = 0;
  selectedPlayCard: PlayedCard | null = null;

  life = 20;

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDeckFromServer();
    // Expose a getter so the hand window can access the hand data.
    (window as any).getHandData = () => this.hand;
  }
  

  loadDeckFromServer(): void {
    this.http.get<{ deck: any[] }>('/api/deck').subscribe(
      (response) => {
        this.deck = response.deck;
        console.log('Deck loaded from server:', this.deck);
        this.shuffleDeck();
        this.drawHand();
      },
      (error) => {
        console.error('Error loading deck from server', error);
      }
    );
  }

  // Shuffle the deck using the Fisher-Yates algorithm.
  shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    console.log('Deck shuffled:', this.deck);
  }

  // Draw the first 7 cards into the hand and remove them from the deck.
  drawHand(): void {
    const numCardsToDraw = Math.min(7, this.deck.length);
    this.hand = this.deck.slice(0, numCardsToDraw);
    this.deck.splice(0, numCardsToDraw);
    console.log('Hand drawn:', this.hand);
    console.log('Remaining deck:', this.deck);
  }

  // Draw a single card.
  drawCard(): void {
    if (this.deck.length > 0) {
      const drawnCard = this.deck.shift();
      this.hand.push(drawnCard);
      console.log('Card drawn:', drawnCard);
    } else {
      console.log('No cards left in deck.');
    }
  }  

  // Discard a card from hand.
  discardCard(card: any): void {
    const index = this.hand.indexOf(card);
    if (index !== -1) {
      const discardedCard = this.hand.splice(index, 1)[0];
      this.graveyard.push(discardedCard);
      console.log('Card discarded:', discardedCard);
    } else {
      console.log('Card not found in hand.');
    }
  }

  // --- Context Menu for Hand Cards ---
  onRightClick(event: MouseEvent, card: any): void {
    event.preventDefault();
    this.selectedCard = card;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }

  discardSelectedCard(): void {
    if (this.selectedCard) {
      this.discardCard(this.selectedCard);
      this.hideContextMenu();
    }
  }

  hideContextMenu(): void {
    this.contextMenuVisible = false;
    this.selectedCard = null;
  }

  // --- Context Menu for Play Area Cards ---
  onPlayRightClick(event: MouseEvent, played: PlayedCard): void {
    event.preventDefault();
    this.selectedPlayCard = played;
    this.playContextMenuX = event.clientX;
    this.playContextMenuY = event.clientY;
    this.playContextMenuVisible = true;
  }

  // Tap/Untap functionality.
  tapSelectedCard(): void {
    if (this.selectedPlayCard) {
      this.selectedPlayCard.tapped = true;
      console.log('Tapped card:', this.selectedPlayCard);
      this.hidePlayContextMenu();
    }
  }

  untapSelectedCard(): void {
    if (this.selectedPlayCard) {
      this.selectedPlayCard.tapped = false;
      console.log('Untapped card:', this.selectedPlayCard);
      this.hidePlayContextMenu();
    }
  }

  // New: Move the selected played card to the graveyard.
  sendToGraveyardSelectedCard(): void {
    if (this.selectedPlayCard) {
      const index = this.playCards.indexOf(this.selectedPlayCard);
      if (index !== -1) {
        const removed = this.playCards.splice(index, 1)[0];
        // Push only the card object (similar to discarding from hand)
        this.graveyard.push(removed.card);
        console.log('Card sent to graveyard:', removed.card);
      }
    }
    this.hidePlayContextMenu();
  }

  // New: Exile functionality (for now, log the action; optionally remove the card).
  exileSelectedCard(): void {
    if (this.selectedPlayCard) {
      console.log('Exile selected. Functionality not fully implemented.', this.selectedPlayCard);
      // Optionally, remove the card from play and add it to the exile array.
      const index = this.playCards.indexOf(this.selectedPlayCard);
      if (index !== -1) {
        const removed = this.playCards.splice(index, 1)[0];
        this.exile.push(removed.card);
        console.log('Card sent to exile:', removed.card);
      }
    }
    this.hidePlayContextMenu();
  }

  hidePlayContextMenu(): void {
    this.playContextMenuVisible = false;
    this.selectedPlayCard = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.hideContextMenu();
    this.hidePlayContextMenu();
    this.hideGraveContextMenu();
  }
  // --- Drag & Drop Methods ---
  onDragStart(event: DragEvent, item: any, source: 'hand' | 'play'): void {
    this.draggedSource = source;
    this.draggedCard = item;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify(item));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const playContainer = event.currentTarget as HTMLElement;
    const containerRect = playContainer.getBoundingClientRect();
    const dropX = event.clientX - containerRect.left - 50; // adjust as needed
    const dropY = event.clientY - containerRect.top - 100;  // adjust as needed
  
    // Check if the drag event has data from dataTransfer.
    let cardData: any = null;
    if (event.dataTransfer) {
      const data = event.dataTransfer.getData('text/plain');
      if (data) {
        try {
          cardData = JSON.parse(data);
        } catch (err) {
          console.error('Error parsing drag data', err);
        }
      }
    }
  
    if (cardData && cardData.source === 'hand') {
      // Card is coming from the hand (possibly from the second window)
      const card = cardData.card;
      // Remove the card from the hand array if it exists.
      const index = this.hand.indexOf(card);
      if (index !== -1) {
        this.hand.splice(index, 1);
      }
      // Add the card to the play area.
      this.playCards.push({ card: card, x: dropX, y: dropY });
    } else if (this.draggedCard) {
      // Existing behavior for drag events initiated in the main window.
      if (this.draggedSource === 'hand') {
        const index = this.hand.indexOf(this.draggedCard);
        if (index !== -1) {
          this.hand.splice(index, 1);
        }
        this.playCards.push({ card: this.draggedCard, x: dropX, y: dropY });
      } else if (this.draggedSource === 'play') {
        const playedCard = this.draggedCard as PlayedCard;
        playedCard.x = dropX;
        playedCard.y = dropY;
      }
    }
  
    this.draggedCard = null;
    this.draggedSource = null;
  }
  

  showGrave = false;

  showGraveyard() {
    this.showGrave = !this.showGrave;
  }

    // New: Context menu for graveyard cards.
  graveContextMenuVisible: boolean = false;
  graveContextMenuX: number = 0;
  graveContextMenuY: number = 0;
  selectedGraveCard: any = null;

  // Handler for right-click on a graveyard card.
  onGraveRightClick(event: MouseEvent, card: any): void {
    event.preventDefault();
    this.selectedGraveCard = card;
    this.graveContextMenuX = event.clientX;
    this.graveContextMenuY = event.clientY;
    this.graveContextMenuVisible = true;
  }

  // Moves the selected graveyard card back to hand.
  returnToHandSelectedCard(): void {
    if (this.selectedGraveCard) {
      const index = this.graveyard.indexOf(this.selectedGraveCard);
      if (index !== -1) {
        const returnedCard = this.graveyard.splice(index, 1)[0];
        this.hand.push(returnedCard);
        console.log('Returned card from graveyard to hand:', returnedCard);
      }
    }
    this.hideGraveContextMenu();
  }

  // Hides the graveyard context menu.
  hideGraveContextMenu(): void {
    this.graveContextMenuVisible = false;
    this.selectedGraveCard = null;
  }

  mill(): void {
    if (this.deck.length > 0) {
      // Remove the top card from the deck.
      const milledCard = this.deck.shift();
      // Add the removed card to the graveyard.
      this.graveyard.push(milledCard);
      console.log('Milled card:', milledCard);
    } else {
      console.log('No cards left in the deck to mill.');
    }
  }  

  openHandWindow(): void {
    // Open a new window.
    const handWindow = window.open('', 'HandWindow', 'width=400,height=600');
    if (handWindow) {
      // Write HTML for the new window.
      handWindow.document.write(`
        <html>
          <head>
            <title>Your Hand</title>
            <style>
              body { background: black; }
              .card {
                display: inline-block;
                margin: 5px;
                border: 1px solid #ccc;
                cursor: grab;
              }
              .card img { width: 200px; }
            </style>
          </head>
          <body>
            <div id="hand-container"></div>
            <script>
              // When the window loads, fill in the hand.
              window.onload = function() {
                // Retrieve hand data from the opener (main window).
                const hand = window.opener.getHandData();
                const container = document.getElementById('hand-container');
                hand.forEach((card, index) => {
                  const cardDiv = document.createElement('div');
                  cardDiv.classList.add('card');
                  cardDiv.setAttribute('draggable', 'true');
                  // When dragging starts, store card data into the dataTransfer object.
                  cardDiv.addEventListener('dragstart', function(event) {
                    event.dataTransfer.setData('text/plain', JSON.stringify({
                      source: 'hand',
                      card: card
                    }));
                    // Optionally, you might visually indicate that the card is being dragged.
                  });
                  const img = document.createElement('img');
                  img.src = card.image_uris.normal;
                  cardDiv.appendChild(img);
                  container.appendChild(cardDiv);
                });
              }
            <\/script>
          </body>
        </html>
      `);
      handWindow.document.close();
    }
  } 
  
  onTop(): void {
    // First, try to find the card in the deck
    let index = this.deck.indexOf(this.selectedCard);
    if (index !== -1) {
      // If found in deck, remove it and put it on top
      const card = this.deck.splice(index, 1)[0];
      this.deck.unshift(card);
      console.log('Card moved to top of deck:', card);
    } else {
      // If not in the deck, check if it's in the hand
      index = this.hand.indexOf(this.selectedCard);
      if (index !== -1) {
        const card = this.hand.splice(index, 1)[0];
        this.deck.unshift(card);
        console.log('Card moved from hand to top of deck:', card);
      } else {
        console.log('Card not found in deck or hand.');
      }
    }
    // Hide the context menu and clear the selected card
    this.contextMenuVisible = false;
    this.selectedCard = null;
  }

  backToHand(): void {
    if (this.selectedPlayCard) {
      const index = this.playCards.indexOf(this.selectedPlayCard);
      if (index !== -1) {
        const removed = this.playCards.splice(index, 1)[0];
        this.hand.push(removed.card);
        console.log('Card returned to hand:', removed.card);
      } else {
        console.log('Selected play card not found.');
      }
      this.hidePlayContextMenu();
    }
  }
  
  
  
  
}
