import { Component } from '@angular/core';

@Component({
  selector: 'app-build',
  templateUrl: './build.component.html',
  styleUrls: ['./build.component.css']
})
export class BuildComponent {
  selectedDeck: string = ''; // Store selected deck

  constructor() {}

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  onDeckSelected(deckName: string) {
    this.selectedDeck = deckName;
  }
}
