import { Component } from '@angular/core';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-build',
  templateUrl: './build.component.html',
  styleUrls: ['./build.component.css']
})
export class BuildComponent {
  selectedDeck: string = ''; // Store selected deck

  constructor(private searchService: SearchService) {}

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  toggleSearch() {
    this.searchService.toggleSearch();
  }

  // Ensure we receive a string from deckSelected
  onDeckSelected(deckName: string) {
    this.selectedDeck = deckName;
    console.log(`🎯 Updated selectedDeck in BuildComponent: '${this.selectedDeck}'`);
  }
}
