1. INVITACIONES DE PROPIETARIOS.
    * DEJAR REGISTRAR MANUAL POR PROPIETARIO.                   OK
    * DEJAR LA OPCION DE WHATSAPP PARA 1 O MAS CONTACTOS.       OK 
    * ELIMINAR LA OPCION DE EMAIL.                              OK
    * NO ENVIA EL CODIGO QR POR WHATSAPP.                       OK, ELIMINADO CODIGO QR POR WHATSAPP.
    * HACER QUE FUNCIONE QUE ENVIE EL CODIGO QR POR WHATSAPP 

2. PANEL DE GUARDIA.
    * QUITAR EL PANEL AMARILLO QUE DICE QUE LA NOTIFICACION ES AUDITADA.                                OK
    * LAS NOTIFICACIONES DEBEN LLEGAR A LA APLICACION Y AL WHATSAPP DEL VECINO TAMBIEN.                 VER, NO LLEGAN.
    * PONER SONIDO A LA APP QUE SUENE CON LAS NOTIFICACIONES. Y QUE SE PUEDE HABILITAR Y DESABILITAR.   OK
    * HACER QUE CADA BOTON TE MUESTRE LO QUE EL BOTON DA, NO HAGA UN SCROLL GIGANTE.                    OK
    * LA VISTA DE INGRESADOS, EN PREDIO, TODAS Y DEMAS, EN LA PC SE VE BARBARO EN EL TELEFONO UN DESASTRE COPIAR LA VISUAL DE AVISOS DE VECINOS                                                                                             OK

3. ADMIN PRINCIPAL 
    * NO DEBE INVITAR PERSONAS.                                                         OK
    * QUITAR 1 Y 2 QUE LE PREGUNTE A SERGIO QUE ERA.                                    OK
    * DEBE PODER VER EL DETALLE DE INVITADOS DE LA SIGUIENTE MANERA:                    OK
        . DIA                                                                           OK
        . HORA INGRESO                                                                  OK
        . HORA EGRESO                                                                   OK
        . LOTE Y MANZANA AL CUAL SE DIRIGIO                                             OK
    * QUITAR LOS ACCESOS DE PROPIETARIO AL ADMINISTRADOR QUE SEA UN PANEL APARTE.       OK
    * NOTIFICAR A VECINOS X WHATSAPP - POR APP - POR EMAIL
    * DAR DIRECTIVAS A GUARDIA Y SOLICITUDES DE INFORMACION                             OK
    * QUITAR LA TARJETA QUE CONTIENE PADRON DE USUARIOS, CONTROL DE GUARDIA ETC. PARA ESO ESTAN LOS BOTONES DE ADMINISTRADOR.   OK
    * AGREGAR UN BOTON DE CONFIGURACION PARA CONFIGURAR DIRECTO EL EMAIL PARA ENVIAR LOS MAILS A LOS CLIENTES Y EL NUMERO DE WHATSAPP PARA ENVIAR WHATSAPP A LOS CLIENTES.                                                OK
    * BOTONES DE ADMINISTRADOR GENERAL: DEJAR SOLO EL TEXTO GRANDE, QUITAR TEXTO CHICO.                                 OK

4. PROPIETARIOS
    * BOTON DE AVISO A ADMINISTRACION                                                                                           OK
    * EN VISITAS EL PROPIETARIO SOLO DEBERIA PODER CANCELAR LAS QUE AUN NO INGRESARON AL PREDIO, LAS VISITAS PASADAS NO.        OK
    

5. COSAS QUE SE ME OCURREN
    * EN ADMINISTRADOR PRINCIPAL UN BOTON PARA CONFIGURAR EL EMAIL DESDE DONDE SALDRAN LOS MAILS A LOS SOCIOS. QUE EL MISMO DE PUEDA   CAMBIAR.                                                                                                                           OK
    * SI LA APP ESTA CERRADA NO LLEGNA NOTIFICACIONES AL TEL, HACER QUE AUNQUE LA APP ESTE CERRADA, LLEGUEN LAS NOTIFICACIONES AL TEL. 
    
-------------------------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------------------------

6. CAMBIOS A REALIZAR PARA FINAL CLIENTE
    * INVITACION POR WHATSAPP                                                                           OK
        - ABRE WHATSAPP (QUITADO BOTON COPIAR ENLACE)                                                   OK
        - ELIJE INVITADOS                                                                               OK
        - ENVIA FORMULARIO                                                                              OK
        - CLIENTE RECIBE EL LINK                                                                        OK
        - ABRE FORMULARIO Y LO LLENA                                                                    OK
        - BOTON DICE "ENVIAR REGISTRO"                                                                  OK
        - ENVIA FORMULARIO Y SALE LEYENDA "YA REGISTRAMOS SU VISITA, MUCHAS GRACIAS"                    OK
        - ENVIA EL REGISTRO A GUARDIA                                                                   OK
        - ENVIA QR AL INVITADO POR WHATSAPP                                                             OK
        - "Te enviamos el código QR para el ingreso al predio, presentalo en la guardia de ingreso."    OK

    * REGISTRO MANUAL                                                                                   OK
        - CLICK EN REGISTRAR VISITA                                                                     OK
        - ABRE EN OTRA VENTANA EL MISMO FORMULARIO QUE LINK DE WHATSAPP (NO ABRE FORMULARIO DEBAJO)     OK
        - LO LLENA EL PROPIETARIO CON LOS DATOS DEL VISITANTE                                           OK
        - BOTON DICE "ENVIAR REGISTRO"                                                                  OK
        - ENVIA FORMULARIO Y SALE LA LEYENDA "YA REGISTRAMOS TU VISITA, MUCHAS GRACIAS"                 OK
        - NO ENVIA QR AL INVITADO POR WHATSAPP                                                          OK
        - ENVIA EL REGISTRO A GUARDIA                                                                   OK
        - GUARDIA CUANDO LLEGA EL INVITADO LE PIDE EL DNI Y LE DA ACCESO                                OK

7. AUDITORÍA Y AJUSTE RESPONSIVE TOTAL (MÓVILES, TABLETS Y DESKTOP)
    * ADMINISTRADOR / CONTROL DE GUARDIA:                                                               OK
        - Corrección de desborde horizontal en tarjetas de visitas y avisos (.guard-notice-item-card).
        - Contenedores adaptables con min-width: 0, box-sizing: border-box y word-break: break-word.
        - Botones de acción (.guard-visit-actions y .admin-guard-actions-row) convertidos a grid touch fluido en móviles.
        - Fila de búsqueda y filtros con ancho 100% sin empujar el margen exterior.
    * PROPIETARIOS / MIS VISITAS:                                                                       OK
        - Corrección de desborde crítico en la fila de metadatos (.visit-meta) que forzaba 490px en una sola línea.
        - Reestructuración con .visit-item-top, .visit-item-who, .visit-actions y flex-wrap: wrap.
        - Tarjetas de invitación (.invite-methods-grid) fluidas con minmax(min(100%, 280px), 1fr).
    * PADRÓN DE USUARIOS (ADMINISTRADOR):                                                               OK
        - Eliminado min-width: 260px rígido en línea que causaba desborde lateral.
        - Emails largos con overflow-wrap: anywhere y botones de acción en grid adaptativa.
    * GESTIÓN DE EXPENSAS (ADMIN Y VECINOS):                                                             OK
        - Tarjetas de liquidación integradas al sistema semántico .visit-item-top y .visit-actions.
        - Datos bancarios con wrap de alias y CBU en móviles estrechos.
    * SUPERVISIÓN DE CANCHAS DE TENIS Y AVISOS/ALERTAS:                                                  OK
        - Barras de herramientas (.admin-courts-toolbar, .admin-notices-toolbar, .admin-alerts-toolbar) responsive.
        - Cuadrícula de turnos (.booking-grid) adaptable hasta 320px sin recortes de texto.
    * MODALES DEL SISTEMA:                                                                               OK
        - .modal-card con scroll interno independiente (overflow-y: auto) y max-height dinámica.
        - .modal-actions con ajuste automático de botones y apilado táctil en pantallas chicas.
    * FORMULARIO EXTERNO DE INVITACIÓN (invitacion.html):                                               OK
        - Optimización responsive para smartphones (pantallas <= 600px y <= 380px) con ancho dinámico.

