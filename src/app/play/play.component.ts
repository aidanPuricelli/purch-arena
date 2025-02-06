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

  deckNames: string[] = []; // List of available decks
  selectedDeck: string = ''; // Store selected deck

  deck: any[] = [];
  hand: any[] = [];
  graveyard: any[] = [];
  exile: any[] = [];

  // Cards placed in the play area.
  playCards: PlayedCard[] = [];
  commander: any | null = null;

  draggedCard: any = null;
  draggedSource: 'hand' | 'play' | null = null;

  contextMenuVisible: boolean = false;
  showGrave: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  selectedCard: any = null;
  graveContextMenuVisible: boolean = false;
  graveContextMenuX: number = 0;
  graveContextMenuY: number = 0;
  selectedGraveCard: any = null;

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
    this.loadDeckNames();
  }

  // Load all available deck names
  loadDeckNames(): void {
    this.http.get<{ deckNames: string[] }>('/api/decks').subscribe(
      (response) => {
        this.deckNames = response.deckNames;
        console.log('📜 Available Decks:', this.deckNames);
      },
      (error) => console.error('❌ Error loading deck names', error)
    );
  }

  // Load deck after user selects it
  onDeckSelected(): void {
    if (!this.selectedDeck) return;
    
    console.log(`🎯 Loading deck: '${this.selectedDeck}'`);

    this.http.get<{ deck: any[] }>(`/api/deck/${this.selectedDeck}`).subscribe(
      (response) => {
        this.deck = response.deck;
        console.log(`📥 Loaded deck '${this.selectedDeck}':`, this.deck);
        
        this.shuffleDeck();
        this.drawHand();
        this.loadCommander();
      },
      (error) => console.error('❌ Error loading deck', error)
    );
  }

  // Load commander for the selected deck
  loadCommander(): void {
    this.http.get<{ commander: any }>(`/api/deck/${this.selectedDeck}/commander`).subscribe(
      (response) => {
        if (response.commander) {
          this.commander = response.commander;
          console.log(`👑 Commander loaded:`, this.commander);
          this.placeCommanderInPlay();
        } else {
          console.log('⚠️ No commander found for this deck.');
        }
        
        // Shuffle and draw after loading the commander
        this.shuffleDeck();
        this.drawHand();
      },
      (error) => console.error('❌ Error loading commander', error)
    );
  }

  // Place commander in play area
  placeCommanderInPlay(): void {
    if (this.commander) {
      this.playCards.push({ card: this.commander, x: 100, y: 100 });
      console.log(`🚀 Commander placed in play area:`, this.commander);
    }
  }

  // Shuffle the deck 
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

  // Context menu for hand cards
  onRightClick(event: MouseEvent, card: any): void {
    event.preventDefault();
    this.selectedCard = card;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }

  // Discard a card
  discardSelectedCard(): void {
    if (this.selectedCard) {
      this.discardCard(this.selectedCard);
      this.hideContextMenu();
    }
  }

  // Hide context menu
  hideContextMenu(): void {
    this.contextMenuVisible = false;
    this.selectedCard = null;
  }

  // Context menu for play area cards
  onPlayRightClick(event: MouseEvent, played: PlayedCard): void {
    event.preventDefault();
    this.selectedPlayCard = played;
    this.playContextMenuX = event.clientX;
    this.playContextMenuY = event.clientY;
    this.playContextMenuVisible = true;
  }

  // Tap/Untap functionality
  tapSelectedCard(): void {
    if (this.selectedPlayCard) {
      this.selectedPlayCard.tapped = true;
      console.log('Tapped card:', this.selectedPlayCard);
      this.hidePlayContextMenu();
    }
  }

  // upntap, could probably combine this and tap
  untapSelectedCard(): void {
    if (this.selectedPlayCard) {
      this.selectedPlayCard.tapped = false;
      console.log('Untapped card:', this.selectedPlayCard);
      this.hidePlayContextMenu();
    }
  }

  // Send to graveyard
  sendToGraveyardSelectedCard(): void {
    if (this.selectedPlayCard) {
      const index = this.playCards.indexOf(this.selectedPlayCard);
      if (index !== -1) {
        const removed = this.playCards.splice(index, 1)[0];
        this.graveyard.push(removed.card);
        console.log('Card sent to graveyard:', removed.card);
      }
    }
    this.hidePlayContextMenu();
  }

  // Exile functionality (for now, log the action)
  exileSelectedCard(): void {
    if (this.selectedPlayCard) {
      console.log('Exile selected. Functionality not fully implemented.', this.selectedPlayCard);
      const index = this.playCards.indexOf(this.selectedPlayCard);
      if (index !== -1) {
        const removed = this.playCards.splice(index, 1)[0];
        this.exile.push(removed.card);
        console.log('Card sent to exile:', removed.card);
      }
    }
    this.hidePlayContextMenu();
  }

  // Hide play context menu
  hidePlayContextMenu(): void {
    this.playContextMenuVisible = false;
    this.selectedPlayCard = null;
  }

  // Listen
  @HostListener('document:click')
  onDocumentClick(): void {
    this.hideContextMenu();
    this.hidePlayContextMenu();
    this.hideGraveContextMenu();
  }
  // Drag and Drop methods
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
    const dropX = event.clientX - containerRect.left - 50; // change later maybe
    const dropY = event.clientY - containerRect.top - 100;  // change later maybe
  
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
      const card = cardData.card;
      const index = this.hand.indexOf(card);

      if (index !== -1) {
        this.hand.splice(index, 1);
      }

      this.playCards.push({ card: card, x: dropX, y: dropY });
    } else if (this.draggedCard) {
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

  showGraveyard() {
    this.showGrave = !this.showGrave;
  }

  // Right click open context menu (graveyard)
  onGraveRightClick(event: MouseEvent, card: any): void {
    event.preventDefault();
    this.selectedGraveCard = card;
    this.graveContextMenuX = event.clientX;
    this.graveContextMenuY = event.clientY;
    this.graveContextMenuVisible = true;
  }

  // Move back to hand
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

  // Hides the graveyard context menu
  hideGraveContextMenu(): void {
    this.graveContextMenuVisible = false;
    this.selectedGraveCard = null;
  }

  // Mill
  mill(): void {
    if (this.deck.length > 0) {

      const milledCard = this.deck.shift();

      this.graveyard.push(milledCard);
      console.log('Milled card:', milledCard);
    } else {
      console.log('No cards left in the deck to mill.');
    }
  }  
  
  // Put card from hand on top of deck
  onTop(): void {
    let index = this.deck.indexOf(this.selectedCard);

    if (index !== -1) {
      const card = this.deck.splice(index, 1)[0];
      this.deck.unshift(card);
      console.log('Card moved to top of deck:', card);
    } else {
      index = this.hand.indexOf(this.selectedCard);

      if (index !== -1) {
        const card = this.hand.splice(index, 1)[0];
        this.deck.unshift(card);
        console.log('Card moved from hand to top of deck:', card);
      } else {
        console.log('Card not found in deck or hand.');
      }
    }

    this.contextMenuVisible = false;
    this.selectedCard = null;
  }

  // Move card from board back to hand
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
