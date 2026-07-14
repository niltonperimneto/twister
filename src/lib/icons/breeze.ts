/* KDE Breeze symbolic icons — fetched from https://github.com/KDE/breeze-icons
 * (LGPL-3.0-or-later), normalized to currentColor. See LICENSES.md. */

import type { IconGlyph, IconName } from './types';

export const breezeIcons: Partial<Record<IconName, IconGlyph>> = {
  /* devices/22/input-mouse.svg */
  'mouse': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M10 3a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5zm0 1h2a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm0 1v5h2V5z\" fill=\"currentColor\"/>",
  },
  /* devices/22/input-keyboard.svg */
  'keyboard': {
    viewBox: '0 0 22 22',
    body: "<g fill=\"currentColor\"><path d=\"M13 3v2c0 .554-.446 1-1 1-1.108 0-2 .892-2 2H2v11h18V8h-9c0-.554.446-1 1-1 1.108 0 2-.892 2-2V3zM3 9h16v1H3zm0 2h16v7H3z\"/><path d=\"M4 12v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm2 0v1h2v-1zM4 14v1h2v-1zm3 0v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm2 0v1h3v-1zM4 16v1h2v-1zm3 0v1h8v-1zm9 0v1h2v-1z\"/></g>",
  },
  /* actions/22/configure.svg */
  'settings': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M 11.5 3 C 10.286139 3 9.2809778 3.8559279 9.0507812 5 L 3 5 L 3 6 L 9.0507812 6 C 9.2809778 7.1440721 10.286139 8 11.5 8 C 12.713861 8 13.719022 7.1440721 13.949219 6 L 19 6 L 19 5 L 13.949219 5 C 13.719022 3.8559279 12.713861 3 11.5 3 z M 5.5 14 C 4.1149999 14 3 15.115 3 16.5 C 3 17.885 4.1149999 19 5.5 19 C 6.7138604 19 7.7190223 18.144072 7.9492188 17 L 19 17 L 19 16 L 7.9492188 16 C 7.7190223 14.855928 6.7138604 14 5.5 14 z M 5.5 15 C 6.3310001 15 7 15.669 7 16.5 C 7 17.331 6.3310001 18 5.5 18 C 4.6689999 18 4 17.331 4 16.5 C 4 15.669 4.6689999 15 5.5 15 z \" />",
  },
  /* actions/22/love.svg (dialog-information omitted: needs two colors) */
  'heart': {
    viewBox: '0 0 22 22',
    body: "<path fill=\"currentColor\" d=\"M 7 3 C 4.23858 3 2 5.23858 2 8 C 2 13 9 17 11 19 C 13 17 20 13 20 8 C 20 5.23858 17.76142 3 15 3 C 13.36041 3 11.91181 3.78077 11 5 C 10.08819 3.78077 8.6396 3 7 3 z M 7 4 C 8.3221364 4 9.4690059 4.6232029 10.199219 5.5996094 L 11 6.6699219 L 11.800781 5.5996094 C 12.530992 4.6232057 13.677876 4 15 4 C 17.220978 4 19 5.7790218 19 8 C 19 10.033333 17.487537 12.093471 15.566406 13.894531 C 13.902872 15.454095 12.231348 16.625594 11 17.703125 C 9.7686524 16.625594 8.0971281 15.454095 6.4335938 13.894531 C 4.5124626 12.093471 3 10.033333 3 8 C 3 5.7790218 4.7790218 4 7 4 z\"/>",
  },
  /* actions/22/dialog-ok-apply.svg */
  'check': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m382.8643 530.79077l-10.43876 10.56644-4.14699-4.19772-.70712.71578 4.14699 4.1977-.002.002.70713.71577.002-.002.002.002.70711-.71577-.002-.002 10.43877-10.56645-.70712-.71576z\" transform=\"translate(-364.57143-525.79075)\" />",
  },
  /* actions/22/window-close.svg */
  'close': {
    viewBox: '0 0 22 22',
    body: "<g stroke-linecap=\"square\"><path d=\"m6 6 10 10m-10 0 10-10\" fill=\"currentColor\"/><path d=\"M 6,5.1523437 5.1523437,6 10.152344,11 5.1523437,16 6,16.847656 l 5,-5 5,5 L 16.847656,16 l -5,-5 5,-5 L 16,5.1523437 11,10.152344 Z\" fill=\"currentColor\"/></g>",
  },
  /* actions/22/window-minimize.svg */
  'minimize': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m3.707031 7l-.707031.707031 6.125 6.125 1.875 1.875 1.875-1.875 6.125-6.125-.707031-.707031-6.125 6.125-1.167969 1.167969-1.167969-1.167969-6.125-6.125\" />",
  },
  /* actions/22/window-maximize.svg */
  'maximize': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M3.707 15L3 14.293l6.125-6.125L11 6.293l1.875 1.875L19 14.293l-.707.707-6.125-6.125L11 7.707 9.832 8.875 3.707 15\" fill=\"currentColor\"/>",
  },
  /* actions/22/application-menu.svg */
  'menu': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m3 5v2h16v-2h-16m0 5v2h16v-2h-16m0 5v2h16v-2h-16\" />",
  },
  /* actions/22/go-previous.svg */
  'chevron-left': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m14.292969 3l-6.125 6.125-1.875 1.875 1.875 1.875 6.125 6.125.707031-.707031-6.125-6.125-1.167969-1.167969 1.167969-1.167969 6.125-6.125-.707031-.707031\" />",
  },
  /* actions/22/go-down.svg */
  'chevron-down': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m3.707031 7l-.707031.707031 6.125 6.125 1.875 1.875 1.875-1.875 6.125-6.125-.707031-.707031-6.125 6.125-1.167969 1.167969-1.167969-1.167969-6.125-6.125\" />",
  },
  /* actions/22/media-seek-forward.svg */
  'chevrons-right': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m1 3v16l10-8zm10 8v8l10-8-10-8z\" fill=\"currentColor\"/>",
  },
  /* actions/22/view-refresh.svg */
  'refresh': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m11 3a8 8 0 0 0-7.9277344 7h1.0058594a7 7 0 0 1 6.921875-6 7 7 0 0 1 6.320312 4h-3.320312v1h5v-1-4h-1v3.1679688a8 8 0 0 0-7-4.1679688zm6.921875 9a7 7 0 0 1-6.921875 6 7 7 0 0 1-6.3105469-4h3.3105469v-1h-5v1 4h1v-3.195312a8 8 0 0 0 7 4.195312 8 8 0 0 0 7.927734-7h-1.005859z\" fill=\"currentColor\"/>",
  },
  /* actions/22/im-user.svg */
  'users': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M 11 3 A 3.9999902 4.0000296 0 0 0 7 7 A 3.9999902 4.0000296 0 0 0 11 11 A 3.9999902 4.0000296 0 0 0 15 7 A 3.9999902 4.0000296 0 0 0 11 3 z M 11 4 A 3 3.0000296 0 0 1 14 7 A 3 3.0000296 0 0 1 11 10 A 3 3.0000296 0 0 1 8 7 A 3 3.0000296 0 0 1 11 4 z M 11 12 A 7.9999504 8.0000296 0 0 0 3.0722656 19 L 4.0800781 19 A 6.9999604 7.0000296 0 0 1 11 13 A 6.9999604 7.0000296 0 0 1 17.921875 19 L 18.929688 19 A 7.9999504 8.0000296 0 0 0 11 12 z \" />",
  },
  /* status/22/security-high.svg */
  'shield': {
    viewBox: '0 0 22 22',
    body: "<g transform=\"translate(0,-1030.3622)\"><path d=\"M 11 3 C 11 3 9 5.6575188 3 6.3242188 C 3 6.3242188 3 15.6581 11 19 C 19 15.6581 19 6.3242188 19 6.3242188 C 13 5.6575188 11 3 11 3 z M 11 4.3769531 C 12.586995 5.7216531 14.87716 6.6187125 17.845703 7.0703125 C 17.684444 8.5155125 17.529828 9.6030967 17.15625 10.654297 C 16.37116 12.863397 15.455775 14.207328 14.634766 15.173828 C 13.362538 16.671528 12.207192 17.277659 11 17.880859 C 9.792808 17.277659 8.6374614 16.671528 7.3652344 15.173828 C 6.5442254 14.207328 5.62884 12.863397 4.84375 10.654297 C 4.470172 9.6030967 4.3155559 8.5155125 4.1542969 7.0703125 C 7.1228399 6.6187125 9.413005 5.7216531 11 4.3769531 z M 11 5.5761719 C 9.256509 6.7864719 7.2978492 7.3994064 5.3320312 7.8164062 C 6.2628772 13.098406 8.268115 15.357084 11 16.771484 C 13.731885 15.357084 15.737124 13.098406 16.667969 7.8164062 C 14.702151 7.3994063 12.743491 6.7864719 11 5.5761719 z \" transform=\"translate(0,1030.3622)\" /><path d=\"m 15,1041.3622 c 2.216,0 4,1.784 4,4 0,2.216 -1.784,4 -4,4 -2.216,0 -4,-1.784 -4,-4 0,-2.216 1.784,-4 4,-4 z\" /><path d=\"M 17 13 L 14 16 L 13 15 L 12 16 L 13 17 L 14 18 L 18 14 L 17 13 z \" transform=\"translate(0,1030.3622)\" /></g>",
  },
  /* status/22/dialog-warning.svg */
  'alert-circle': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m11.006318 3.0000261a0.72728737 0.72727154 0 0 0-0.65674 0.4021811l-7.2728738 14.545431a0.72728737 0.72727154 0 0 0 0.6509222 1.052362h14.545748a0.72728737 0.72727154 0 0 0 0.650922-1.052362l-7.272874-14.545431a0.72728737 0.72727154 0 0 0-0.645104-0.4021811z\" fill=\"currentColor\"/><path d=\"m10 8v5h2v-5zm0 7v2h2v-2z\" fill=\"currentColor\"/>",
  },
  /* actions/22/clock.svg */
  'clock': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m11 3c-4.431998 0-8 3.568002-8 8 0 4.431998 3.568002 8 8 8 4.431998 0 8-3.568002 8-8 0-4.431998-3.568002-8-8-8m0 1c3.877999 0 7 3.122001 7 7 0 3.877999-3.122001 7-7 7-3.877999 0-7-3.122001-7-7 0-3.877999 3.122001-7 7-7m-1 1v7h1 5v-1h-5v-6h-1\" />",
  },
  /* actions/22/brightness-high.svg */
  'sun': {
    viewBox: '0 0 22 22',
    body: "<g shape-rendering=\"auto\"><path d=\"m11 7c-2.2032167 0-4 1.7967833-4 4 0 2.203217 1.7967833 4 4 4 2.203217 0 4-1.796783 4-4 0-2.2032167-1.796783-4-4-4zm0 1c1.662777 0 3 1.3372234 3 3 0 1.662777-1.337223 3-3 3-1.6627766 0-3-1.337223-3-3 0-1.6627766 1.3372234-3 3-3z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"m10.5 3v3h1v-3h-1z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"m10.5 16v3h1v-3h-1z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"m3 10.5v1h3v-1h-3z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"m16 10.5v1h3v-1h-3z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"m14.707031 14-0.707031 0.707031 2.121094 2.121094 0.707031-0.707031-2.121094-2.121094z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"M 5.7070312 5 L 5 5.7070312 L 7.1210938 7.828125 L 7.828125 7.1210938 L 5.7070312 5 z \" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"M 7.1210938 14 L 5 16.121094 L 5.7070312 16.828125 L 7.828125 14.707031 L 7.1210938 14 z \" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"M 16.121094 5 L 14 7.1210938 L 14.707031 7.828125 L 16.828125 5.7070312 L 16.121094 5 z \" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><g><path d=\"m11.000001 7.7500005v6.4999985h2.166665l1.083333-2.166666v-2.1666663l-1.083333-2.1666662z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\"/><path d=\"m10.984375 7.734375v0.015625 6.515625h2.191406l1.089844-2.177734v-2.1757816l-1.089844-2.1777344h-2.191406zm0.03125 0.03125h2.140625l1.078125 2.1542969v2.1601561l-1.078125 2.154297h-2.140625v-6.46875z\" fill=\"currentColor\" color-rendering=\"auto\" dominant-baseline=\"auto\" image-rendering=\"auto\" /></g></g>",
  },
  /* places/22/user-home.svg */
  'home': {
    viewBox: '0 0 22 22',
    body: "<path d=\"m11 3l-.707031.707031-7.292969 7.292969.707031.707031.292969-.292969v7.585938h1 5 3 5v-1-6.585938l.292969.292969.707031-.707031-3-3v-3h-3l-1.292969-1.292969-.707031-.707031m0 1.414063l6 5.999999v7.585938h-4v-5h-3-1v5h-4v-7.585938l6-5.999999\" />",
  },
  /* actions/22/link.svg */
  'external-link': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M 3 7 C 2.4459904 7 2 7.4459904 2 8 L 2 14 C 2 14.55401 2.4459904 15 3 15 L 9 15 C 9.55401 15 10 14.55401 10 14 L 10 13 L 12 13 L 12 14 C 12 14.554 12.44599 15 13 15 L 19 15 C 19.55401 15 20 14.554 20 14 L 20 8 C 20 7.446 19.55401 7 19 7 L 13 7 C 12.44599 7 12 7.446 12 8 L 12 9 L 10 9 L 10 8 C 10 7.4459904 9.55401 7 9 7 L 3 7 z M 3 8 L 7 8 L 9 8 L 9 9 C 8.4459904 9 8 9.4459904 8 10 L 8 12 C 8 12.55401 8.4459904 13 9 13 L 9 14 L 7 14 L 3 14 L 3 8 z M 13 8 L 16 8 L 19 8 L 19 14 L 16 14 L 13 14 L 13 13 C 13.55401 13 14 12.55401 14 12 L 14 10 C 14 9.4459904 13.55401 9 13 9 L 13 8 z M 9 10 L 13 10 L 13 12 L 9 12 L 9 10 z \" />",
  },
  /* actions/22/list-add-user.svg */
  'user-plus': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M 11 3 C 9.338 3 8 4.338 8 6 C 8 7.662 9.338 9 11 9 C 12.662 9 14 7.662 14 6 C 14 4.338 12.662 3 11 3 z M 11 11 C 8.23 11 6 11.89198 6 13 L 6 18 L 6 19 L 7.2011719 19 L 13 19 L 13 18 L 7 18 L 7 13.427734 C 7 12.636304 8.784 12 11 12 C 12.795116 12 14.289377 12.420682 14.798828 13 L 16 13 C 16 11.89198 13.77 11 11 11 z M 16 14 L 16 16 L 14 16 L 14 17 L 16 17 L 16 19 L 17 19 L 17 17 L 19 17 L 19 16 L 17 16 L 17 14 L 16 14 z \" />",
  },
  /* actions/22/color-management.svg */
  'palette': {
    viewBox: '0 0 22 22',
    body: "<g transform=\"matrix(1.24886 0 0 1.24887 -2.738 -1289.52)\"><g transform=\"matrix(0.38637 0.10353 -0.10353 0.38637 -92.63 796.68)\"><use xlink:href=\"#H\" transform=\"matrix(1 0 0 1 384.57 499.8)\"/><use xlink:href=\"#J\"/><path fill=\"currentColor\" d=\"m408.57143 507.798c8.86399 0 16 7.13601 16 16h-16v-16\"/><use xlink:href=\"#I\"/></g><g opacity=\"0.7\" transform=\"matrix(0.4 0 0 0.4 -152.43 831.84)\"><use filter=\"url(#4)\" xlink:href=\"#H\" transform=\"matrix(1 0 0 1 384.57 499.8)\"/><use filter=\"url(#4)\" xlink:href=\"#J\"/><use filter=\"url(#4)\" xlink:href=\"#I\"/><path fill=\"currentColor\" filter=\"url(#4)\" d=\"m408.57143 507.798c8.86399 0 16 7.13601 16 16h-16v-16\"/></g><use opacity=\"0.35\" xlink:href=\"#H\" transform=\"matrix(0.28284 0.28284 -0.28284 0.28284 11 1027.79)\"/><path opacity=\"0.35\" fill=\"currentColor\" d=\"m408.57143 539.798c-8.86399 0-16-7.13601-16-16h16v16\" transform=\"matrix(0.28284 0.28284 -0.28284 0.28284 43.591 777.65)\"/><use opacity=\"0.35\" xlink:href=\"#I\" transform=\"matrix(0.28284 0.28284 -0.28284 0.28284 43.591 777.65)\"/><path opacity=\"0.35\" fill=\"currentColor\" d=\"m408.57143 507.798c8.86399 0 16 7.13601 16 16h-16v-16\" transform=\"matrix(0.28284 0.28284 -0.28284 0.28284 43.591 777.65)\"/><g transform=\"matrix(0.10353 0.38637 -0.38637 0.10353 171.08 829.27)\"><use opacity=\"0.3\" xlink:href=\"#H\" transform=\"matrix(1 0 0 1 384.57 499.8)\"/><use opacity=\"0.3\" xlink:href=\"#J\"/><use opacity=\"0.3\" xlink:href=\"#I\"/><path opacity=\"0.3\" fill=\"currentColor\" d=\"m408.57143 507.798c8.86399 0 16 7.13601 16 16h-16v-16\"/></g></g>",
  },
  /* actions/22/layer-visible-on.svg */
  'layers': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M 4 3 L 1 7 L 18 7 L 21 3 L 4 3 z M 4 9 L 1 13 L 18 13 L 21 9 L 4 9 z M 4 15 L 1 19 L 18 19 L 21 15 L 4 15 z \" />",
  },
  /* actions/22/sidebar-expand.svg */
  'panel-left': {
    viewBox: '0 0 22 22',
    body: "<g fill=\"currentColor\"><path d=\"m3 3v16h16v-16zm5 1h10v14h-10z\" stroke-linecap=\"square\" stroke-linejoin=\"round\"/><path d=\"m11.353516 6.6464844 4.353515 4.3535156-4.353515 4.353516-.707032-.707032 3.646485-3.646484-3.646485-3.6464844z\"/></g>",
  },
  /* mimetypes/22/text-x-script.svg */
  'file-code': {
    viewBox: '0 0 22 22',
    body: "<g transform=\"matrix(1 0 0 1 -326 -534.3622)\"><path d=\"M 4.765625 4 L 4 4.6054688 L 8.7070312 10 L 4 15.394531 L 4.765625 16 L 10 10 L 4.765625 4 z M 10 17 L 10 18 L 18 18 L 18 17 L 10 17 z \" transform=\"matrix(1 0 0 1 326 534.3622)\"/></g>",
  },
  /* actions/22/tools-wizard.svg */
  'wand-2': {
    viewBox: '0 0 22 22',
    body: "<path d=\"M 4.5 3 L 3.96875 3.96875 L 3 4.5 L 3.96875 5.03125 L 4.5 6 L 5.03125 5.03125 L 6 4.5 L 5.03125 3.96875 L 4.5 3 z M 9.5 3 L 8.96875 3.96875 L 8 4.5 L 8.96875 5.03125 L 9.5 6 L 10.03125 5.03125 L 11 4.5 L 10.03125 3.96875 L 9.5 3 z M 16.171875 3 L 3 16.171875 L 5.828125 19 L 19 5.828125 L 16.171875 3 z M 16.103516 4.4824219 L 17.517578 5.8964844 L 14.419922 8.9960938 L 13.003906 7.5800781 L 16.103516 4.4824219 z M 6.5 7 L 5.96875 7.96875 L 5 8.5 L 5.96875 9.03125 L 6.5 10 L 7.03125 9.03125 L 8 8.5 L 7.03125 7.96875 L 6.5 7 z \" />",
  },
};
