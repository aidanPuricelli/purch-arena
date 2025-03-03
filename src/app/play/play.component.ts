import { ChangeDetectorRef, Component, HostListener, input, NgZone, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { io } from 'socket.io-client';
import { timer } from 'rxjs';

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

interface Card {
  name: string;
  id: string;
  image_uris?: {
    normal: string;
  };
}



@Component({
  selector: 'app-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.css']
})
export class PlayComponent implements OnInit {
  serverPort = 'http://localhost:3001';

  actionHistory: GameAction[] = [];

  tokenTypes: { name: string; imageUrl: string }[] = [];
  selectedToken: string = '';

  zoomedCard: any = null;

  lifeFontSize = 30;

  // MATCHMAKING
  roomId: string = '';
  opponentPlayCards: PlayedCard[] = []; 
  showRoomModal = false;
  playerId = '';
  opponentBoards: { playerId: string, playCards: any[] }[] = [];
  showPlayerIdModal = false;
  showUrlModal = false;

  // webrtc (possible replacement for polling)
  socket: any;
  peerConnection!: RTCPeerConnection;
  dataChannel!: RTCDataChannel;


  resizeFlag = false;
  advancedFlag = false;
  deckSelectFlag = false;
  showSettings = false;
  handFlag = true;
  minimizedOptions = true;
  showNav = true;
  showTimer = false;
  myTimer = false;

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

  playOptionsFontSize = 18;
  playOptionsPosition = 80;

  life = 20;

  cardWidth = 200;

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  showSaveModal = false;
  showLoadModal = false;
  savedStates: string[] = [];
  selectedSavedState: string = '';
  saveGameName = '';


  // timer
  timeLeft: number = 7200; // 2 hours in seconds
  timerInterval: any;

  // update card width
  updateCardWidth(newWidth: number): void {
    this.cardWidth = newWidth;
    this.cdRef.detectChanges();
  }

  // ***************************
  // need to combine all toggle
  // methods into a single method
  // ***************************

  // toggle display of settings drop down
  toggleSettings(): void {
    if (this.resizeFlag || this.deckSelectFlag) {
      this.resizeFlag = false;
      this.deckSelectFlag = false;
      return
    }
    if (this.advancedFlag) this.advancedFlag = false;
    this.showSettings = !this.showSettings;
  }

  // toggle display of card resize
  toggleResize() {
    this.resizeFlag = !this.resizeFlag;
    this.showSettings = false;
  }

  // toggle display of card resize
  toggleAdvanced() {
    this.advancedFlag = !this.advancedFlag;
  }

  // toggle display of hand
  toggleHand() {
    this.handFlag = !this.handFlag;
    this.showSettings = false;
  }

  // toggle display of deck selection
  toggleDeckSelect() {
    this.deckSelectFlag = !this.deckSelectFlag;
    this.showSettings = false;
  }

  // toggle display of play options
  toggleOptions() {
    this.minimizedOptions = !this.minimizedOptions;
    this.showSettings = false;
  }

  // toggle display of nav
  toggleNav() {
    this.showNav = !this.showNav;
    this.showSettings = false;

    if (this.showNav) {
      this.playOptionsPosition = 80;
    } else {
      this.playOptionsPosition = 20;

    }
    document.documentElement.style.setProperty('--play-options-position', `${this.playOptionsPosition}px`);
    document.documentElement.style.setProperty('--deck-selection-position', `${this.playOptionsPosition + 120}px`);
  }

  constructor(private http: HttpClient, private cdRef: ChangeDetectorRef, private zone: NgZone) {}

  // on init of page
  ngOnInit(): void {
    this.loadSettings();
    this.loadDeckNames();
    this.fetchTokens();
    this.updateFontSize();

    this.initializeWebRTC();

    this.playerId = localStorage.getItem("playerId") || this.generatePlayerId();
    console.log("🔹 Assigned playerId:", this.playerId);

    // ✅ Listen for real-time game state updates
    this.socket.on('update-game-state', ({ playerId, playCards }: { playerId: string; playCards: any[] }) => {
      console.log(`📡 Received updated game state from ${playerId}`, playCards);
      
      // ✅ Update only the opponent's board
      this.opponentBoards = this.opponentBoards.map(board =>
          board.playerId === playerId ? { playerId, playCards } : board
      );

      // ✅ If no board exists for this player, add a new entry
      if (!this.opponentBoards.some(board => board.playerId === playerId)) {
          this.opponentBoards.push({ playerId, playCards });
      }
    });
  }

  generatePlayerId(): string {
    return `player_${Math.random().toString(36).substr(2, 9)}`; // Generates a unique ID
  }

  // update font size of play options
  updateFontSize() {
    document.documentElement.style.setProperty('--play-options-font-size', `${this.playOptionsFontSize}px`);
    document.documentElement.style.setProperty('--life-font-size', `${this.playOptionsFontSize + 10}px`);
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
      this.sendGameState();
    } else {
      console.warn('No token selected!');
    }
  }

  // Load all available deck names
  loadDeckNames(): void {
    const headers = new HttpHeaders({
      "ngrok-skip-browser-warning": "true"
    });
  
    this.http.get<{ deckNames: string[] }>(`${this.serverPort}/api/decks`, {headers}).subscribe(
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
  

  onDeckSelected(): void {
    if (!this.selectedDeck) return;
  
    console.log(`Loading deck: '${this.selectedDeck}'`);
  
    // Add the required header to bypass Ngrok's browser warning
    const headers = new HttpHeaders({
      "ngrok-skip-browser-warning": "true"
    });
  
    this.http.get<{ deck: any[] }>(`${this.serverPort}/api/deck/${this.selectedDeck}`, { headers })
      .subscribe(
        (response) => {
          this.deck = response.deck;
          console.log(`Loaded deck '${this.selectedDeck}':`, this.deck);
  
          this.playCards = [];
          this.graveyard = [];
          this.exile = [];
  
          this.toggleDeckSelect();
          this.loadCommander();
          this.shuffleDeck();
          this.drawHand();
        },
        (error) => console.error('Error loading deck', error)
      );
  }

  // Load commander for the selected deck
  loadCommander(): void {
    const headers = new HttpHeaders({
      "ngrok-skip-browser-warning": "true"
    });
    this.http.get<{ commander: any }>(`${this.serverPort}/api/deck/${this.selectedDeck}/commander`, { headers }).subscribe(
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

  // Toggle card selection on normal click
  toggleCardSelection(played: any, event: MouseEvent): void {
    event.stopPropagation();

    const index = this.selectedPlayCards.indexOf(played);

    if (index === -1) {
      this.selectedPlayCards.push(played);
    } else {
      this.selectedPlayCards.splice(index, 1);
    }

    this.cdRef.detectChanges();
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

      this.actionHistory.push({
        type: 'tap',
        cards: this.selectedPlayCards.map(card => ({
          card,
          previousState: card.tapped
        }))
      });

      this.selectedPlayCards.forEach(card => card.tapped = true);
      this.hidePlayContextMenu();
    }
  }

  // Untap all selected cards
  untapSelectedCard(): void {
    if (this.selectedPlayCards.length > 0) {
      
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

  // Toggle tapped state for a single card
  toggleTapCard(played: any, event: MouseEvent): void {
    event.stopPropagation();

    // Push the action of tapping the double-clicked card to the history
    this.actionHistory.push({
      type: 'tap',
      cards: [{
        card: played,
        previousState: played.tapped
      }]
    });

    // Toggle the tapped state
    played.tapped = !played.tapped;

    this.cdRef.detectChanges();

    console.log(`Card "${played.card.name}" tapped state: ${played.tapped}`);
  }


  // send selected to graveyard
  sendToGraveyardSelectedCard(): void {
    if (this.selectedPlayCards.length > 0) {
      const action: GameAction = {
        type: 'sendToGraveyard',
        cards: this.selectedPlayCards.map(card => ({
          card: { ...card.card },
          previousLocation: 'play',
          previousPosition: { x: card.x, y: card.y }
        }))
      };
  
      this.addActionToHistory(action);
  
      this.selectedPlayCards.forEach(card => {
        const index = this.playCards.indexOf(card);
        if (index !== -1) {
          this.playCards.splice(index, 1);
          this.graveyard.push(card.card);
        }
      });
  
      console.log("Moved selected cards to graveyard:", this.selectedPlayCards);
      this.selectedPlayCards = [];
      this.hidePlayContextMenu();
    }
  }
  
  // Exile functionality, add logic for logging action for undo
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
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.settings-dropdown');
    const settingsIcon = document.querySelector('.settings-icon');

    // Hide all context menus
    this.hideContextMenu();
    this.hidePlayContextMenu();
    this.hideGraveContextMenu();

    // Hide settings if the click is outside the dropdown and settings icon
    if (
      this.showSettings &&
      dropdown &&
      !dropdown.contains(target) &&
      settingsIcon &&
      !settingsIcon.contains(target)
    ) {
      this.showSettings = false;
    }
  }


  // Listen some more
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('play-options')) {
      this.minimizedOptions = !this.minimizedOptions;
    }

    if (target.classList.contains('hand')) {
      this.handFlag = !this.minimizedOptions;
    }
  }

  // Listen even more?
  @HostListener('document:keydown.control.z', ['$event'])
  handleUndoShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    this.undoAction();
  }

  // ???
  @HostListener('document:keydown', ['$event'])
  handleDeleteKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.sendToGraveyardSelectedCard();
    }
  }

  // you're kidding
  @HostListener('document:keydown.control.g', ['$event'])
  handleShowGraveyardShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    this.showGraveyard();
  }

  // Track cursor offset when dragging
  private cursorOffsetX = 0;
  private cursorOffsetY = 0;

  // Drag and Drop methods
  onDragStart(event: DragEvent, item: any, source: 'hand' | 'play'): void {
    this.draggedSource = source;
    this.draggedCard = item;

    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify(item));
      event.dataTransfer.effectAllowed = 'move';

      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      this.cursorOffsetX = event.clientX - rect.left;
      this.cursorOffsetY = event.clientY - rect.top;

      const dragImage = new Image();
      dragImage.src = item.card?.image_uri || item.image_uri || 'https://example.com/default-token.jpg';
      dragImage.width = this.cardWidth;

      const cardHeight = this.cardWidth * 1.4;
      dragImage.height = cardHeight;

      dragImage.style.position = 'absolute';
      dragImage.style.border = 'solid 3px white';
      dragImage.style.borderRadius = '10px';
      dragImage.style.opacity = '0.8';
      dragImage.style.pointerEvents = 'none';

      document.body.appendChild(dragImage);

      event.dataTransfer.setDragImage(dragImage, this.cursorOffsetX, this.cursorOffsetY);

      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
  }

  // dragging over play area
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  // on dropping card
  onDrop(event: DragEvent): void {
    event.preventDefault();
    const playContainer = event.currentTarget as HTMLElement;
    const containerRect = playContainer.getBoundingClientRect();

    const dropX = event.clientX - containerRect.left - this.cursorOffsetX;
    const dropY = event.clientY - containerRect.top - this.cursorOffsetY;

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
    this.sendGameState();
    this.draggedCard = null;
    this.draggedSource = null;
  }

  // toggle show graveyardd
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
  handFromGraveyard(): void {
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

  // Send selected card to exile
  exileFromGraveyard(): void {
    if (this.selectedGraveCard) {
      const index = this.graveyard.indexOf(this.selectedGraveCard);
      if (index !== -1) {

        const exiledCard = this.graveyard.splice(index, 1)[0];

        this.exile.push(exiledCard);

        console.log('Sent card from graveyard to exile:', exiledCard);
      }
    }
    this.hideGraveContextMenu();
  }

  // Play selected card from graveyard
  playFromGraveyard(): void {
    if (this.selectedGraveCard) {
      const index = this.graveyard.indexOf(this.selectedGraveCard);
      if (index !== -1) {

        const cardToPlay = this.graveyard.splice(index, 1)[0];

        this.playCards.push({
          card: cardToPlay,
          x: 100,
          y: 100,
          tapped: false,
          counters: 0,
        });

        console.log('Played card from graveyard:', cardToPlay);
      }
    }
    this.hideGraveContextMenu();
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

  // put card from hand on bottom of library
  onBottom(): void {
    let index = this.deck.indexOf(this.selectedCard);

    if (index !== -1) {
        const card = this.deck.splice(index, 1)[0];
        this.deck.push(card);
        console.log('Card moved to bottom of deck:', card);
    } else {
        index = this.hand.indexOf(this.selectedCard);

        if (index !== -1) {
            const card = this.hand.splice(index, 1)[0];
            this.deck.push(card);
            console.log('Card moved from hand to bottom of deck:', card);
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

  closeGraveyard() {
    this.showGrave = false;
  }

  // draw new 7
  newSeven() {
    this.playCards = [];
    this.graveyard = [];
    this.exile = [];
    this.hand = [];

    this.loadCommander();
    this.shuffleDeck();
    this.drawHand();
  }

  undoAction(): void {
    if (this.actionHistory.length === 0) {
      console.log("No actions to undo.");
      return;
    }
  
    const lastAction = this.actionHistory.pop();
    if (!lastAction || !lastAction.cards) return;
  
    console.log("Undoing action:", lastAction);
  
    lastAction.cards.forEach(entry => {
      switch (lastAction.type) {
        case 'tap':
        case 'untap':
          entry.card.tapped = entry.previousState ?? false;
          break;
  
        case 'sendToGraveyard':
          this.restoreCard(entry, this.graveyard, this.playCards, true);
          break;
  
        case 'exile':
          this.restoreCard(entry, this.exile, this.playCards, true);
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
  
  private restoreCard(
    entry: { card: any; previousLocation?: string; previousPosition?: { x: number; y: number } }, 
    fromZone: any[], 
    toZone: any[], 
    wrapAsPlayedCard: boolean = false
  ): void {
    const index = fromZone.findIndex(c => c.name === entry.card.name);
    if (index !== -1) {
      const restoredCard = fromZone.splice(index, 1)[0];
  
      if (wrapAsPlayedCard) {
        toZone.push({
          card: restoredCard, 
          x: entry.previousPosition?.x || 100, 
          y: entry.previousPosition?.y || 100 
        });
      } else {
        toZone.push(restoredCard);
      }
  
      console.log(`Restored ${entry.card.name} from ${entry.previousLocation} to ${wrapAsPlayedCard ? "play" : "another zone"}.`);
    } else {
      console.warn(`Could not restore ${entry.card.name}. Card not found in ${entry.previousLocation}.`);
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

  // Open the save game modal
  openSaveModal() {
    this.showSaveModal = true;
    this.saveGameName = '';
  }

  // open load game modal
  openLoadModal() {
    this.showLoadModal = true;
    this.fetchSavedStates();
  }

  // Close the modal
  closeSaveModal() {
    this.showSaveModal = false;
    this.selectedSavedState = '';
  }

  // close load mocal
  closeLoadModal() {
    this.showLoadModal = false;
  }

  // Fetch saved states from server and remove .json extensions
  fetchSavedStates() {
    fetch('/saved-states')
      .then(response => response.json())
      .then(data => {
        if (data.savedStates) {
          // Remove .json extension from each state name
          this.savedStates = data.savedStates.map((state: string) => state.replace(/\.json$/, ''));
        }
      })
      .catch(error => {
        console.error('Error fetching saved states:', error);
        alert('Failed to retrieve saved states.');
      });
  }

  // Load the selected game state
  loadSelectedState() {
    if (!this.selectedSavedState) {
      alert('Please select a saved state to load.');
      return;
    }

    const fileName = `${this.selectedSavedState}.json`;

    const headers = {
      "ngrok-skip-browser-warning": "true"
    };

    // Fetch the game state from the server
    fetch(`${this.serverPort}/api/load-game/${fileName}`, {headers})
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load game state: ${response.status}`);
        }
        return response.json();
      })
      .then((gameState) => {
        this.hand = gameState.hand.map((card: Card) => ({
          ...card,
          image_uris: card.image_uris || { normal: 'https://via.placeholder.com/200x280?text=No+Image' }
        }));

        this.playCards = gameState.play.map((pc: any) => ({
          card: {
            ...pc.card,
            image_uris: pc.card.image_uris || { normal: 'https://via.placeholder.com/200x280?text=No+Image' }
          },
          x: pc.x,
          y: pc.y,
          tapped: pc.tapped ?? false,
          counters: pc.counters ?? 0
        }));

        this.graveyard = gameState.graveyard.map((card: Card) => ({
          ...card,
          image_uris: card.image_uris || { normal: 'https://via.placeholder.com/200x280?text=No+Image' }
        }));

        this.exile = gameState.exile.map((card: Card) => ({
          ...card,
          image_uris: card.image_uris || { normal: 'https://via.placeholder.com/200x280?text=No+Image' }
        }));

        this.deck = gameState.deck.map((card: Card) => ({
          ...card,
          image_uris: card.image_uris || { normal: 'https://via.placeholder.com/200x280?text=No+Image' }
        }));

        this.closeLoadModal();

        alert(`Game state "${this.selectedSavedState}" loaded successfully!`);
      })
      .catch(error => {
        console.error('Error loading game state:', error);
        alert('Failed to load the selected game state.');
      });
  }



  // save game state
  saveState() {
    if (!this.saveGameName) {
      alert('Please enter a name for the game state.');
      return;
    }

    const gameState = {
      hand: this.hand.map(card => ({
        name: card.name,
        id: card.id,
        image_uri: card.image_uri || 'https://via.placeholder.com/200x280?text=No+Image'
      })),
      play: this.playCards.map(pc => ({
        card: {
          name: pc.card.name,
          id: pc.card.id,
          image_uri: pc.card.image_uri || 'https://via.placeholder.com/200x280?text=No+Image'
        },
        x: pc.x,
        y: pc.y,
        tapped: pc.tapped ?? false,
        counters: pc.counters ?? 0
      })),
      graveyard: this.graveyard.map(card => ({
        name: card.name,
        id: card.id,
        image_uri: card.image_uri || 'https://via.placeholder.com/200x280?text=No+Image'
      })),
      exile: this.exile.map(card => ({
        name: card.name,
        id: card.id,
        image_uri: card.image_uri || 'https://via.placeholder.com/200x280?text=No+Image'
      })),
      deck: this.deck.map(card => ({
        name: card.name,
        id: card.id,
        image_uri: card.image_uri || 'https://via.placeholder.com/200x280?text=No+Image'
      })),
      timestamp: new Date().toISOString()
    };

    // Send the game state to the server
    fetch(`${this.serverPort}/api/save-game`,  {
      method: 'POST',
      body: JSON.stringify({
        gameName: this.saveGameName,
        gameState: gameState
      }),
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          alert(data.message);
          this.closeSaveModal();
        } else {
          alert('Failed to save game state.');
        }
      })
      .catch(error => {
        console.error('Error saving game state:', error);
        alert('Failed to save game state.');
      });
  }


  // save current card width and font-size
  saveSettings() {
    const settings = {
      cardWidth: this.cardWidth,
      playOptionsFontSize: this.playOptionsFontSize
    };

    fetch(`${this.serverPort}/api/save-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
      "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify(settings),
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          alert(data.message);
        } else {
          alert('Failed to save settings.');
        }
      })
      .catch(error => {
        console.error('Error saving settings:', error);
        alert('Failed to save settings.');
      });
  }

  // load card width and font size
  loadSettings() {
    const headers = {
      "ngrok-skip-browser-warning": "true"
    };
    fetch(`${this.serverPort}/api/load-settings`, {headers})
      .then(response => response.json())
      .then(settings => {
        if (settings.cardWidth !== undefined) this.cardWidth = settings.cardWidth;
        if (settings.playOptionsFontSize !== undefined) {
          this.playOptionsFontSize = settings.playOptionsFontSize;
          this.updateFontSize();
        } 
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
      });
  }


  // ************************************
  // MATCHMAKING 
  // ************************************
  createRoom() {
    this.http.post<{ roomId: string, serverUrl: string }>('http://localhost:3001/api/matchmaking/create-room', {})
      .subscribe(response => {
        console.log('Room created (from backend):', response.roomId);
        
        this.serverPort = response.serverUrl;
        console.log('✅ Updated serverPort:', this.serverPort);
        
        // Store the correct room ID before joining
        this.roomId = response.roomId;
        console.log('🔹 Stored roomId:', this.roomId);
  
        this.joinRoom(this.roomId);
        this.myTimer = true;
        this.startTimer();
      }, error => {
        console.error('❌ Error creating room:', error);
      });
  }
  
  
  
  joinRoom(roomId: string) {
    if (!this.playerId) {
      console.error("❌ Player ID is missing!");
      return;
    }
  
    console.log(`Joining room with ID: ${roomId} as player: ${this.playerId}`);
  
    this.http.post(`${this.serverPort}/api/matchmaking/join-room`, {
        roomId,
        playerId: this.playerId  // ✅ Ensure this is sent properly
      })
      .subscribe(response => {
        console.log("✅ Joined room:", response);
        this.roomId = roomId; // ✅ Store the correct roomId
        console.log("🔹 Current roomId stored:", this.roomId);
      }, error => {
        console.error("❌ Error joining room:", error);
      });
    }
  


  syncGameState(roomId: string) {
    if (!this.playerId) {
        console.error("❌ Player ID is missing!");
        return;
    }

    console.log("🔄 Sending playCards to server:", this.playCards);

    this.http.post(`${this.serverPort}/api/game/sync-state`, { 
        roomId, 
        playerId: this.playerId, 
        playCards: this.playCards 
    }).subscribe(() => {
        console.log('✅ Game state synced');

        // ✅ Instead of polling, update opponent boards in real-time
        this.fetchOpponentBoards(roomId);
        this.sendGameState();
    }, error => {
        console.error('❌ Error syncing game state', error);
    });
  }

  fetchOpponentBoards(roomId: string) {
    console.log("📡 Fetching opponent boards...");
  
    this.http.get<{ opponentBoards: any[] }>(
        `${this.serverPort}/api/game/game-state/${roomId}/${this.playerId}`,
        { headers: new HttpHeaders({ "ngrok-skip-browser-warning": "true" }) }
    ).subscribe(
        response => {
            console.log("📡 Raw Response:", response);
            console.log("📡 Opponent Boards Data:", response.opponentBoards);

            if (response.opponentBoards.length === 0) {
                console.warn("⚠️ No opponents found in the room.");
                this.opponentBoards = [];
            } else {
                this.opponentBoards = response.opponentBoards;
            }

            console.log("📡 Parsed Opponent Boards (Final State):", this.opponentBoards);
        },
        error => {
            console.error('❌ Error fetching opponent game state', error);
        }
    );
}

  
  
  
  



  setPlayerId(inputId: string) {
    this.playerId = inputId;
    this.showPlayerIdModal = false;
  }

  // Open the join room modal
  openPlayerIdModal() {
    this.showPlayerIdModal = true;
  }

  // Close the modal
  closePlayerIdModal() {
    this.showPlayerIdModal = false;
  }

  // Open the join room modal
  openUrlModal() {
    this.showUrlModal = true;
  }

  // Close the modal
  closeUrlModal() {
    this.showUrlModal = false;
  }
  


  // Open the join room modal
  openRoomModal() {
    this.showRoomModal = true;
  }

  // Close the modal
  closeRoomModal() {
    this.showRoomModal = false;
  }


  initializeWebRTC() {
    this.socket = io('http://localhost:3001');

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebRTC signaling server');
    });

    // Join room
    this.socket.emit('join-room', { roomId: this.roomId, playerId: this.playerId });

    // Listen for player connection
    this.socket.on('player-joined', ({ playerId }: { playerId: string }) => {
      console.log(`👥 Player ${playerId} joined!`);
      this.startWebRTC();
    });

    // Handle SDP offer
    this.socket.on('receive-offer', async ({ sdp, sender }: { sdp: RTCSessionDescriptionInit; sender: string }) => {
      console.log(`📩 Received offer from ${sender}`);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit('send-answer', { target: sender, sdp: answer });
    });

    // Handle SDP answer
    this.socket.on('receive-answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      console.log('📩 Received answer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    // Handle ICE candidate
    this.socket.on('receive-ice-candidate', ({ candidate, sender }: { candidate: RTCIceCandidateInit; sender: string }) => {
      console.log('📩 Received ICE candidate from', sender);
      this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  startWebRTC() {
    this.peerConnection = new RTCPeerConnection();
    this.dataChannel = this.peerConnection.createDataChannel('gameState');

    // Send game state when DataChannel is open
    this.dataChannel.onopen = () => {
      console.log('📡 DataChannel open!');
      this.sendGameState();
    };

    // Receive opponent's game state
    this.dataChannel.onmessage = (event) => {
      console.log('📩 Received game state:', event.data);
      this.opponentBoards = JSON.parse(event.data);
    };

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('send-ice-candidate', { target: this.peerConnection, candidate: event.candidate });
      }
    };

    // Create SDP offer
    this.peerConnection.createOffer().then((offer) => {
      this.peerConnection.setLocalDescription(offer);
      this.socket.emit('send-offer', { target: this.peerConnection, sdp: offer as RTCSessionDescriptionInit });
    });
  }

  sendGameState() {
    if (this.roomId) {
        
        // Emit the updated game state to the server
        this.socket.emit('sync-game-state', { 
            roomId: this.roomId, 
            playerId: this.playerId, 
            playCards: this.playCards 
        });
    }
  }

  setUrl(url: string) {
    this.serverPort = url;
    this.closeUrlModal();
  }

  copyUrlToClipboard() {
    navigator.clipboard.writeText(this.serverPort).then(() => {
      console.log('URL copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  copyRoomIdToClipboard() {
    navigator.clipboard.writeText(this.roomId).then(() => {
      console.log('URL copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // Function to start the timer
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  // Function to format time into HH:MM:SS format
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(secs)}`;
  }

  padZero(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  toggleTimer() {
    this.showTimer = !this.showTimer;
  }

}
