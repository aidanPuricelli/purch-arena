import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  searchQuery: string = '';
  cardImages: any[] = [];
  contextMenuVisible: boolean = false;
  menuX: number = 0;
  menuY: number = 0;
  selectedCard: any | null = null;

  @Input() selectedDeck: string = ''; // Receive selectedDeck from BuildComponent

  constructor( private http: HttpClient ) {}

  onSearch() {
    if (!this.searchQuery.trim()) return;

    const apiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(this.searchQuery)}`;

    this.http.get<any>(apiUrl).subscribe(response => {
        console.log('API Response:', response);
        if (response.data) {
            this.cardImages = response.data.filter((card: any) => card.image_uris && card.image_uris.normal);
            console.log('Filtered Images:', this.cardImages);
        }
    }, error => {
        console.error('Error fetching cards:', error);
        this.cardImages = [];
    });
  }

  onRightClick(event: MouseEvent, card?: any) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.menuX = event.clientX;
    this.menuY = event.clientY;
    this.selectedCard = card || null;
  }

  hideContextMenu() {
    this.contextMenuVisible = false;
  }

  saveImage() {
    if (!this.selectedDeck) {
      console.warn('⚠️ No deck selected. Cannot add card.');
      return;
    }

    if (this.selectedCard) {
      console.log(`Saving card to deck '${this.selectedDeck}':`, this.selectedCard);

      window.dispatchEvent(new CustomEvent('addCardToDeck', { detail: this.selectedCard }));

      this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [this.selectedCard], removedCards: [] }).subscribe(
        (response) => {
          console.log(`Card added to deck '${this.selectedDeck}':`, response);
        },
        (error) => console.error('Error adding card to deck', error)
      );
    }
    this.hideContextMenu();
  }
}
