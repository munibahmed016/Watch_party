import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '@/screens/admin/AdminDashboardScreen';
import AdminContentScreen from '@/screens/admin/AdminContentScreen';
import AdminUsersScreen from '@/screens/admin/AdminUsersScreen';
import AdminSubscriptionsScreen from '@/screens/admin/AdminSubscriptionsScreen';
import AdminCreatorsScreen from '@/screens/admin/AdminCreatorsScreen';
import AdminReviewScreen from '@/screens/admin/AdminReviewScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminContent: undefined;
  AdminUsers: undefined;
  AdminSubscriptions: undefined;
  AdminCreators: undefined;
  AdminReview: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: 'transparent' } }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="AdminContent" component={AdminContentScreen} />
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
    <Stack.Screen name="AdminSubscriptions" component={AdminSubscriptionsScreen} />
    <Stack.Screen name="AdminCreators" component={AdminCreatorsScreen} />
    <Stack.Screen name="AdminReview" component={AdminReviewScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;