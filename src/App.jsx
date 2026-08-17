import React from 'react';
import Navbar from './Components/Navbar';
import HomePage from './Pages/HomePage';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <HomePage />
    </div>
  );
}