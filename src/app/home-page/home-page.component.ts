import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  showSettings = false;

  constructor(private http: HttpClient) {}

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  // Download Single JSON File
  downloadFile(fileName: string): void {
    const link = document.createElement('a');
    link.href = `/api/download/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadBoth(): void {
    this.downloadFile('decks.json');
    setTimeout(() => this.downloadFile('commander.json'), 500);
  }

  // Upload JSON File
  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    this.http.post('/api/upload', formData).subscribe({
      next: () => alert(`${file.name} uploaded successfully!`),
      error: (err) => alert(`Error uploading file: ${err.error.message}`)
    });

    input.value = '';
  }
}
