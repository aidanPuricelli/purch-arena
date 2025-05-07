import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CardInfoService {

  constructor() { }

  // extract card type (update needed to work for artifact creatures)
  extractMainType(typeLine: string): string {
    if (!typeLine) return 'Unknown';
  
    const typeParts = typeLine.split('—')[0].trim().split(' ');
    const mainType = typeParts.find(type => !['Legendary', 'Basic', 'Snow', 'Token'].includes(type));
  
    return mainType || 'Unknown';
  }

  // extract mana cost
  extractNumericManaCost(manaCost: string): number {
    if (!manaCost) return 0; 
  
    const numericPart = manaCost.match(/\d+/g); // Extract numbers
    const coloredMana = manaCost.match(/[WUBRGC]/g); // Extract letters
  
    const numericValue = numericPart ? numericPart.map(Number).reduce((sum, val) => sum + val, 0) : 0;
    const coloredCount = coloredMana ? coloredMana.length : 0;
  
    return numericValue + coloredCount; 
  }
}
