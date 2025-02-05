import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component'; // Adjust the path as needed
import { BuildComponent } from './build/build.component';
import { PlayComponent } from './play/play.component';

const routes: Routes = [
  { path: '', component: HomePageComponent }, // Redirects '/' to HomePageComponent
  { path: 'build', component: BuildComponent}, // build page
  { path: 'play', component: PlayComponent} // play page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
