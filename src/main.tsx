import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App.tsx';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/tiptap/styles.css';
import 'prosemirror-view/style/prosemirror.css';
import '@mantine/carousel/styles.css';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals'; 
const theme = createTheme({
  fontFamily: 'Open Sans, sans-serif',
  colors: {
    brand: [
      '#e6f7f6',
      '#ccefee',
      '#99dfdd',
      '#66cfcc',
      '#33bebb',
      '#00aeaa', // main
      '#008a87', // darker
      '#006666',
      '#004444',
      '#002222',
    ],
  },
  primaryColor: 'brand',
  components: {
    TextInput: {
      styles: (theme: { colors: { brand: any[]; }; }) => ({
        input: {
          '&:focus': {
            borderColor: theme.colors.brand[6], // viền theo màu brand
            boxShadow: `0 0 0 2px ${theme.colors.brand[2]}`, // glow nhẹ
          },
        },
      }),
    },
  },
});


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" zIndex={1000} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>
);