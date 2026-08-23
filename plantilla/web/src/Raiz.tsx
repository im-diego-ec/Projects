import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";

/**
 * La raiz de la aplicacion: decide si hay auth y monta el arbol.
 *
 * Con clave publicable de Clerk, la app corre envuelta en su provider. Sin
 * ella corre sin auth, que es el modo con el que un desarrollador puede
 * levantar el proyecto recien clonado sin credenciales de nadie. La decision
 * vive en un componente —y no en main.tsx— para que sea PROBABLE: es la unica
 * rama del arranque, y es exactamente la clase de rama que uno quiere ver
 * verificada (un despliegue que se queda sin la variable no debe "parecer"
 * funcionar).
 *
 * OJO con lo que esta prueba NO puede afirmar: que la app EXIJA auth en
 * produccion no lo garantiza el front. Eso lo verifica el backend en cada
 * request (constitucion: la autoridad es el servidor, cero logica de seguridad
 * en el cliente).
 */
export function Raiz() {
  // Se lee en el render y no al cargar el modulo: asi el valor no queda
  // congelado en la primera importacion, y una prueba puede ejercitar las dos
  // ramas sin recargar modulos.
  const clavePublicable = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!clavePublicable) return <App clerkHabilitado={false} />;

  return (
    <ClerkProvider publishableKey={clavePublicable}>
      <App clerkHabilitado />
    </ClerkProvider>
  );
}
