import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface PlayedCard {
  card: any;
  x: number;
  y: number;
  tapped?: boolean;
  counters?: number;
}

interface GameAction {
  type: 'tap' | 'untap' | 'sendToGraveyard' | 'exile' | 'discard' | 'moveBack';
  cards?: { 
    card: PlayedCard; 
    previousState?: boolean;
    previousLocation?: 'play' | 'hand' | 'graveyard' | 'exile';
    previousPosition?: { x: number; y: number };
  }[];
}



@Component({
  selector: 'app-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.css']
})
export class PlayComponent implements OnInit {

  actionHistory: GameAction[] = [];

  tokenTypes: { name: string; imageUrl: string }[] = [];
  selectedToken: string = '';

  zoomedCard: any = null;

  selectedDeckCard: any = null;
  showTutor: boolean = false;
  showToken: boolean = false;

  deckNames: string[] = [];
  selectedDeck: string = ''; 

  isDragging = false;
  selectionBox = { x: 0, y: 0, width: 0, height: 0 };
  startX = 0;
  startY = 0;
  selectedPlayCards: PlayedCard[] = [];

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

  cardWidth = 200; // Default width

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  updateCardWidth(newWidth: number): void {
    this.cardWidth = newWidth;
    this.cdRef.detectChanges();
  }

  constructor(private http: HttpClient, private cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadDeckNames();
    this.fetchTokens();
  }

  // Fetch all tokens
  fetchTokens(url: string = 'https://api.scryfall.com/cards/search?q=game:paper+t:token+is:unique'): void {
    this.http.get<{ data: any[], has_more: boolean, next_page: string }>(url).subscribe(
      (response) => {
        this.tokenTypes = [
          ...this.tokenTypes,
          ...response.data.map(token => ({
            name: token.name,
            imageUrl: token.image_uris?.normal || 'https://example.com/default-token.jpg'
          }))
        ];
  
        console.log('Tokens fetched so far:', this.tokenTypes.length);
  
        if (response.has_more && response.next_page) {
          this.fetchTokens(response.next_page);
        } else {
          this.addExtraTokens();
        }
      },
      (error) => console.error('Error fetching tokens:', error)
    );
  }

  // Get some extra tokens
  addExtraTokens(): void {
    const extraTokens = [
      { name: 'Treasure', imageUrl: 'https://cards.scryfall.io/normal/front/b/b/bbe8bced-9524-47f6-a600-bf4ddc072698.jpg?1562539795' },
      { name: 'Food', imageUrl: 'https://cards.scryfall.io/normal/front/b/f/bf36408d-ed85-497f-8e68-d3a922c388a0.jpg?1572489210' },
      { name: 'Clue', imageUrl: 'https://cards.scryfall.io/normal/front/2/9/291e6490-6727-45ae-90ba-de2ff8f63162.jpg?1562086863' },
    ];
  
    this.tokenTypes = [...this.tokenTypes, ...extraTokens];
  
    console.log('Extra tokens added:', extraTokens.map(t => t.name));
  }
  
  // Add token to play area
  placeTokenInPlay(): void {
    const token = this.tokenTypes.find(t => t.name === this.selectedToken);
    if (token) {
      const tokenCard = {
        id: `token-${token.name}`,
        name: token.name,
        image_uris: { normal: token.imageUrl }
      };

      this.playCards.push({ card: tokenCard, x: 150, y: 150, counters: 0 });
      console.log(`Token placed in play area:`, tokenCard);
    } else {
      console.warn('No token selected!');
    }
  }

  // Load all available deck names
  loadDeckNames(): void {
    this.http.get<{ deckNames: string[] }>('/api/decks').subscribe(
      (response) => {
        this.deckNames = response.deckNames;
        console.log('Available Decks:', this.deckNames);
      },
      (error) => console.error('Error loading deck names', error)
    );
  }

  // Increase counters for selected cards
  increaseCounterOnSelectedCards(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
  
    if (this.selectedPlayCards.length > 0) {
      this.selectedPlayCards.forEach(card => {
        card.counters = (card.counters || 0) + 1;
      });

      this.cdRef.detectChanges();
  
      console.log("Increased counters for selected cards:", this.selectedPlayCards);
    }
  }
  
  // Decrease counters for selected cards
  decreaseCounterOnSelectedCards(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
  
    if (this.selectedPlayCards.length > 0) {
      this.selectedPlayCards.forEach(card => {
        if (card.counters && card.counters > 0) {
          card.counters = Math.max(0, card.counters - 1);
        }
      });
  
      this.cdRef.detectChanges();
  
      console.log("Decreased counters for selected cards:", this.selectedPlayCards);
    }
  }
  

  // Increase counter for a specific card (direct click)
  increaseCounter(card: PlayedCard, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    card.counters = (card.counters || 0) + 1;
    console.log(`Increased counter for ${card.card.name}:`, card.counters);
  }

  // Decrease counter for a specific card (direct click)
  decreaseCounter(card: PlayedCard, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (card.counters && card.counters > 0) {
      card.counters = Math.max(0, card.counters - 1);
      console.log(`Decreased counter for ${card.card.name}:`, card.counters);
    }
  }
  
  
  
  // Increase life
  increaseLife() {
    this.life++;
  }

  // Decrease life
  decreaseLife(event: MouseEvent) {
    event.preventDefault();
    this.life--;
  }
  

  // Load deck after user selects it
  onDeckSelected(): void {
    if (!this.selectedDeck) return;
    
    console.log(`Loading deck: '${this.selectedDeck}'`);

    this.http.get<{ deck: any[] }>(`/api/deck/${this.selectedDeck}`).subscribe(
      (response) => {
        this.deck = response.deck;
        console.log(`Loaded deck '${this.selectedDeck}':`, this.deck);

        this.playCards = [];
      
        this.loadCommander();
        this.shuffleDeck();
        this.drawHand();
      },
      (error) => console.error('Error loading deck', error)
    );
  }

  // Load commander for the selected deck
  loadCommander(): void {
    this.http.get<{ commander: any }>(`/api/deck/${this.selectedDeck}/commander`).subscribe(
      (response) => {
        if (response.commander) {
          this.commander = response.commander;
          console.log(`Commander loaded:`, this.commander);
          this.life = 40;
          this.placeCommanderInPlay();
        } else {
          console.log('No commander found for this deck.');
          this.life = 20;
        }
        
      },
      (error) => {
        console.error('Error loading commander', error);
        this.life = 20;
      }
    );
  }

  // Place commander in play area
  placeCommanderInPlay(): void {
    if (this.commander) {
      this.playCards.push({ card: this.commander, x: 100, y: 100 });
      console.log(`Commander placed in play area:`, this.commander);
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

    if (!this.selectedPlayCards.includes(played)) {
      this.selectedPlayCards.push(played);
    }

    this.selectedPlayCard = played;
    this.playContextMenuX = event.clientX;
    this.playContextMenuY = event.clientY;
    this.playContextMenuVisible = true;
  }

  // Tap all selected cards
  tapSelectedCard(): void {
    if (this.selectedPlayCards.length > 0) {
      // Store previous tap state in action history
      this.actionHistory.push({
        type: 'tap',
        cards: this.selectedPlayCards.map(card => ({
          card,
          previousState: card.tapped
        }))
      });

      this.selectedPlayCards.forEach(card => card.tapped = true);
      console.log("Tapped multiple cards:", this.selectedPlayCards);
      this.hidePlayContextMenu();
    }
  }

  // Untap all selected cards
  untapSelectedCard(): void {
    if (this.selectedPlayCards.length > 0) {
      // Store previous tap state in action history
      this.actionHistory.push({
        type: 'untap',
        cards: this.selectedPlayCards.map(card => ({
          card,
          previousState: card.tapped
        }))
      });

      this.selectedPlayCards.forEach(card => card.tapped = false);
      console.log("Untapped multiple cards:", this.selectedPlayCards);
      this.hidePlayContextMenu();
    }
  }
 

  // send selected to graveyard
  sendToGraveyardSelectedCard(): void {
    if (this.selectedPlayCards.length > 0) {
      const action: GameAction = {
        type: 'sendToGraveyard',
        cards: this.selectedPlayCards.map(card => ({
          card: { ...card },  // Create a copy to avoid mutation issues
          previousLocation: 'play',
          previousPosition: { x: card.x, y: card.y }
        }))
      };
  
      this.addActionToHistory(action);
  
      this.selectedPlayCards.forEach(card => {
        const index = this.playCards.indexOf(card);
        if (index !== -1) {
          this.playCards.splice(index, 1);
          this.graveyard.push(card);
        }
      });
  
      console.log("Moved selected cards to graveyard:", this.selectedPlayCards);
      this.selectedPlayCards = []; // Clear selection
      this.hidePlayContextMenu();
    }
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
  
      const dragImage = new Image();
      dragImage.src = item.card?.image_uris?.normal || item.image_uris?.normal || 'https://example.com/default-token.jpg';
      dragImage.width = 200;
      dragImage.style.height = 'auto';
      dragImage.style.position = 'absolute';
      dragImage.style.border = 'solid 3px white';
      dragImage.style.borderRadius = '10px';
      dragImage.style.opacity = '0.8';
      dragImage.style.pointerEvents = 'none';
  
      document.body.appendChild(dragImage);
  
      const offsetX = 50;
      const offsetY = 100;
      event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
  
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
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

  // Mouse Down (Start Selection)
  onMouseDown(event: MouseEvent): void {
    const playContainer = event.currentTarget as HTMLElement;
    const containerRect = playContainer.getBoundingClientRect();

    const target = event.target as HTMLElement;
    if (target.closest('.played-card')) {
      return;
    }
  
    this.isDragging = true;
    this.startX = event.clientX - containerRect.left;
    this.startY = event.clientY - containerRect.top;
    this.selectionBox = { x: this.startX, y: this.startY, width: 0, height: 0 };
  }
  
  

  // Mouse Move (Update Selection Box)
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const currentX = event.clientX;
    const currentY = event.clientY;

    this.selectionBox = {
      x: Math.min(this.startX, currentX),
      y: Math.min(this.startY, currentY),
      width: Math.abs(currentX - this.startX),
      height: Math.abs(currentY - this.startY)
    };
  }

  // Get all cards in selection box
  onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
  
    this.selectedPlayCards = [];
  
    const selectionLeft = this.selectionBox.x;
    const selectionTop = this.selectionBox.y;
    const selectionRight = selectionLeft + this.selectionBox.width;
    const selectionBottom = selectionTop + this.selectionBox.height;
  
    this.playCards.forEach(card => {
      const cardLeft = card.x;
      const cardTop = card.y;
      const cardRight = cardLeft + 100;
      const cardBottom = cardTop + 140;
  
      if (
        cardRight >= selectionLeft &&
        cardLeft <= selectionRight &&
        cardBottom >= selectionTop &&
        cardTop <= selectionBottom
      ) {
        if (!this.selectedPlayCards.includes(card)) {
          this.selectedPlayCards.push(card);
        }
      }
    });
  
    if (this.selectedPlayCards.length > 0) {
      this.playContextMenuX = event.clientX;
      this.playContextMenuY = event.clientY;
      this.playContextMenuVisible = true;
    }
  }

  // Add selected card to hand and remove it from the deck
  addToHandFromDeck(): void {
    if (!this.selectedDeckCard) {
      console.warn('No card selected.');
      return;
    }

    const index = this.deck.indexOf(this.selectedDeckCard);
    if (index !== -1) {
      this.deck.splice(index, 1);
      this.hand.push(this.selectedDeckCard);
      console.log('Card added to hand:', this.selectedDeckCard);
    }

    this.selectedDeckCard = null;
  }

  // Toggle the TUTOR dropdown
  toggleTutor(): void {
    this.showTutor = !this.showTutor;
    if (this.showTutor) {
      this.showToken = false;
    }
  }

  // Toggle the TOKEN dropdown
  toggleToken(): void {
    this.showToken = !this.showToken;
    if (this.showToken) {
      this.showTutor = false;
    }
  }

  // Zoom 
  zoomSelectedCard(): void {
    if (this.selectedPlayCards.length === 1) {
      this.zoomedCard = this.selectedPlayCards[0].card;
      console.log('Zooming card:', this.zoomedCard);
    }
  }

  // Close zoom overlay when clicking outside
  closeZoom(): void {
    this.zoomedCard = null;
  }

  undoAction(): void {
    if (this.actionHistory.length === 0) {
      console.log("No actions to undo.");
      return;
    }
  
    const lastAction = this.actionHistory.pop(); // Get the most recent action
    if (!lastAction || !lastAction.cards) return;
  
    console.log("Undoing action:", lastAction);
  
    lastAction.cards.forEach(entry => {
      switch (lastAction.type) {
        case 'tap':
        case 'untap':
          entry.card.tapped = entry.previousState ?? false;
          break;
  
        case 'sendToGraveyard':
          this.restoreCard(entry, this.graveyard, this.playCards);
          break;
  
        case 'exile':
          this.restoreCard(entry, this.exile, this.playCards);
          break;
  
        case 'discard':
          this.restoreCard(entry, this.graveyard, this.hand);
          break;
  
        case 'moveBack':
          this.restoreCard(entry, this.hand, this.deck);
          break;
  
        default:
          console.warn("Undo action type not recognized:", lastAction.type);
      }
    });
  
    console.log("Undo complete. Current state:", {
      hand: this.hand,
      play: this.playCards,
      graveyard: this.graveyard,
      exile: this.exile
    });
  }
  

  private restoreCard(entry: { card: PlayedCard; previousLocation?: string; previousPosition?: { x: number; y: number } }, fromZone: PlayedCard[], toZone: PlayedCard[]): void {
    const index = fromZone.findIndex(c => c.card.name === entry.card.card.name);
    if (index !== -1) {
      const restoredCard = fromZone.splice(index, 1)[0];
  
      toZone.push({
        card: restoredCard.card,
        x: entry.previousPosition?.x || 100,
        y: entry.previousPosition?.y || 100
      });
  
      console.log(`Restored ${entry.card.card.name} from ${entry.previousLocation} to play.`);
    } else {
      console.warn(`Could not restore ${entry.card.card.name}. Card not found in ${entry.previousLocation}.`);
    }
  }
  
  
  

  // add action to history, prune if needee
  addActionToHistory(action: GameAction): void {
    this.actionHistory.push(action);

    if (this.actionHistory.length > 10) {
      this.actionHistory.splice(0, this.actionHistory.length - 10);
      console.log("Action history pruned to last 10 actions.");
    }
  }

  

}
