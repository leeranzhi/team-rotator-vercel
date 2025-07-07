'use client';

import React, { useState } from 'react';
import { Inter } from 'next/font/google';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  ThemeProvider,
  createTheme,
  CssBaseline,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as TaskIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Members', icon: <PeopleIcon />, path: '/members' },
    { text: 'Tasks', icon: <TaskIcon />, path: '/tasks' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Team Rotator
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <Link key={item.text} href={item.path} style={{ textDecoration: 'none', color: 'inherit' }}>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => {
                if (isMobile) {
                  handleDrawerToggle();
                }
              }}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.16)',
                  },
                },
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%) scale(0)',
                  transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                  opacity: 0,
                  pointerEvents: 'none',
                },
                '&:active::before': {
                  transform: 'translate(-50%, -50%) scale(3)',
                  opacity: 1,
                  transition: 'transform 0.4s ease-out, opacity 0s',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </Link>
        ))}
      </List>
    </div>
  );

  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex' }}>
              <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
              >
                <Toolbar>
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { sm: 'none' } }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div">
                    Team Rotator
                  </Typography>
                </Toolbar>
              </AppBar>
              <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
              >
                <Drawer
                  variant={isMobile ? 'temporary' : 'permanent'}
                  open={mobileOpen}
                  onClose={handleDrawerToggle}
                  ModalProps={{
                    keepMounted: true,
                  }}
                  sx={{
                    '& .MuiDrawer-paper': {
                      boxSizing: 'border-box',
                      width: drawerWidth,
                    },
                  }}
                >
                  {drawer}
                </Drawer>
              </Box>
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  width: { sm: `calc(100% - ${drawerWidth}px)` },
                  marginTop: '64px',
                }}
              >
                {children}
              </Box>
            </Box>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
} 