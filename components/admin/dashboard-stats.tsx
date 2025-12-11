"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Layers } from "lucide-react";
import type { User } from "@/types/user";

interface DashboardStatsProps {
  users: User[];
  totalStories: number;
}

export function DashboardStats({ users, totalStories }: DashboardStatsProps) {
  const totalUsers = users.length;
  const verifiedUsers = users.filter((u) => u.isVerified).length;
  const disabledUsers = users.filter((u) => u.disabled).length;
  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            {adminCount} Admins registered
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Verified Accounts
          </CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{verifiedUsers}</div>
          <p className="text-xs text-muted-foreground">
            {totalUsers > 0
              ? ((verifiedUsers / totalUsers) * 100).toFixed(1)
              : 0}
            % of total users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Banned Users</CardTitle>
          <UserX className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{disabledUsers}</div>
          <p className="text-xs text-muted-foreground">Login access revoked</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Stories</CardTitle>
          <Layers className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStories}</div>
          <p className="text-xs text-muted-foreground">
            Live stories right now
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
