import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { BuildComponent } from './build/build.component';
import { PlayComponent } from './play/play.component';

const routes: Routes = [
  { path: '', component: HomePageComponent }, // home page
  { path: 'build', component: BuildComponent}, // build page
  { path: 'play', component: PlayComponent} // play page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
