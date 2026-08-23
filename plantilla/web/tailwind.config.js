/** @type {import('tailwindcss').Config} */
// La configuracion de estilos es el UNICO lugar del repo donde los valores de
// marca se escriben a mano; el resto del codigo los consume como tokens (el
// linter del marco pone en rojo un hex suelto en el JSX). Al extender el tema,
// los valores salen del sistema de diseno del area, no de la vista.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
