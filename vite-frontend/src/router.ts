// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import AddVehicle from './AddVehicle.vue'; 

const routes = [
  { path: '/', name: 'App', component: App },
  { path: '/AddVehicle', name: 'AddVehicle', component: AddVehicle },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
