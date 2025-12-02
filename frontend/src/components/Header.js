import React from 'react';

function Header({ title }) {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 justify-between sticky top-0 z-10">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      <div className="flex items-center space-x-4">
        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
          TL
        </div>
      </div>
    </header>
  );
}

export default Header;
