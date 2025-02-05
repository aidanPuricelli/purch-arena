import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  searchQuery: string = '';
  cardImages: any[] = []; // Store full card data
  contextMenuVisible: boolean = false;
  menuX: number = 0;
  menuY: number = 0;
  selectedCard: any | null = null;

  constructor(private http: HttpClient, private searchService: SearchService) {}

  onSearch() {
    if (!this.searchQuery.trim()) return;

    const apiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(this.searchQuery)}`;

    this.http.get<any>(apiUrl).subscribe(response => {
        console.log('API Response:', response);
        if (response.data) {
            this.cardImages = response.data.filter((card: any) => card.image_uris && card.image_uris.normal);
            console.log('Filtered Images:', this.cardImages); // Debugging
        }
    }, error => {
        console.error('Error fetching cards:', error);
        this.cardImages = [];
    });
}



  onRightClick(event: MouseEvent, card?: any) {
    event.preventDefault(); // Prevent default context menu

    this.contextMenuVisible = true;
    this.menuX = event.clientX;
    this.menuY = event.clientY;
    this.selectedCard = card || null;
  }

  hideContextMenu() {
    this.contextMenuVisible = false;
  }

  saveImage() {
    if (this.selectedCard) {
      console.log('Adding to deck:', this.selectedCard);
      window.dispatchEvent(new CustomEvent('addCardToDeck', { detail: this.selectedCard }));
    }
    this.hideContextMenu();
  }
}
