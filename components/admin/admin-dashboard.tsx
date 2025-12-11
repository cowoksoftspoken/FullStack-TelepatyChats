"use client";

import {
  DocumentData,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Crown,
  MessageSquare,
  Power,
  ShieldAlert,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BroadcastMessage } from "@/components/admin/broadcast-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useFirebase } from "@/lib/firebase-provider";
import type { VerificationRequest } from "@/types/admin";
import type { User as UserType } from "@/types/user";
import Link from "next/link";
import { DashboardStats } from "./dashboard-stats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export function AdminDashboard({ userData }: { userData?: DocumentData }) {
  const { db, currentUser } = useFirebase();
  // const [userData, setUserData] = useState<UserType | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<
    (VerificationRequest & { user: UserType })[]
  >([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("verification");
  const [storiesCount, setStoriesCount] = useState<number>(0);
  const [reports, setReports] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!userData?.isAdmin) return;

    const fetchVerificationRequests = async () => {
      try {
        const q = query(
          collection(db, "verificationRequests"),
          where("status", "==", "pending")
        );

        const querySnapshot = await getDocs(q);
        const requests: (VerificationRequest & { user: UserType })[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const requestData = docSnapshot.data() as VerificationRequest;
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", requestData.userId)
          );

          const userDoc = await getDocs(userQuery);
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data() as UserType;
            requests.push({
              ...requestData,
              id: docSnapshot.id,
              user: userData,
            });
          }
        }

        setVerificationRequests(requests);
      } catch (error) {
        console.error("Error fetching verification requests:", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        const usersData: UserType[] = [];

        querySnapshot.forEach((doc) => {
          usersData.push(doc.data() as UserType);
        });

        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchStoriesCount = async () => {
      try {
        const now = new Date().toISOString();
        const coll = collection(db, "stories");
        const q = query(coll, where("expiresAt", ">", now));

        const snapshot = await getCountFromServer(q);
        setStoriesCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching stories count:", error);
      }
    };

    const fetchReports = async () => {
      try {
        const q = query(
          collection(db, "reports"),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        const reportsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(reportsData);
      } catch (error) {
        console.error("Error reports:", error);
      }
    };

    Promise.all([
      fetchVerificationRequests(),
      fetchUsers(),
      fetchStoriesCount(),
      fetchReports(),
    ]).finally(() => setIsLoading(false));
  }, [userData, db]);

  const initiateDeleteUser = (userId: string, userName: string) => {
    if (!userData?.isAdmin) return;
    if (userId === currentUser?.uid) return;

    setUserToDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !userData?.isAdmin) return;

    setIsDeleting(true);

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userToDelete.id,
          idToken,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed");

      setUsers(users.filter((u) => u.uid !== userToDelete.id));

      toast({
        title: "Account Deleted",
        description: `${userToDelete.name} has been permanently removed.`,
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete user.",
      });
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleReportAction = async (
    reportId: string,
    action: "dismiss" | "resolve"
  ) => {
    if (!userData?.isAdmin) return;
    try {
      await updateDoc(doc(db, "reports", reportId), {
        status: action === "dismiss" ? "dismissed" : "resolved",
        adminId: currentUser.uid,
        processedAt: new Date().toISOString(),
      });

      setReports((prev) => prev.filter((r) => r.id !== reportId));

      toast({ title: `Report ${action}ed` });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (!userData?.isAdmin) return;

    if (userId === currentUser.uid) {
      toast({
        title: "Access denied",
        variant: "destructive",
        description: "you cannot disable your own account",
      });
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();
      // await updateDoc(doc(db, "users", userId), {
      //   disabled: !currentStatus,
      // });

      // console.table({
      //   userId,
      //   idToken,
      //   disable: !currentStatus,
      // });
      // return;

      if (userId) {
        const response = await fetch("/api/admin/toggle-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            disable: !currentStatus,
            idToken,
          }),
        });

        const result = await response.json();

        console.log(`[ToggleStatus] ${JSON.stringify(result)}}`);

        if (!response.ok) throw new Error(result.error || "Failed");
      }

      setUsers(
        users.map((u) =>
          u.uid === userId ? { ...u, disabled: !currentStatus } : u
        )
      );

      toast({
        title: "Success",
        description: `User account ${currentStatus ? "disabled" : "Enabled"}.`,
      });
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status.",
      });
    }
  };

  // const handleDeleteUser = async (userId: string, userName: string) => {
  //   if (!userData?.isAdmin) return;
  //   if (userId === currentUser?.uid) return;

  //   if (
  //     !confirm(
  //       `Are you sure you want to PERMANENTLY delete user ${userName}? This cannot be undone.`
  //     )
  //   )
  //     return;

  //   try {
  //     const idToken = await currentUser.getIdToken();

  //     // await deleteDoc(doc(db, "users", userId));
  //     const response = await fetch("/api/admin/delete-user", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         userId,
  //         idToken,
  //       }),
  //     });

  //     const result = await response.json();
  //     console.log(`[DeleteUser] ${JSON.stringify(result)}`);

  //     if (!response.ok) throw new Error(result.error || "Failed");
  //     setUsers(users.filter((u) => u.uid !== userId));

  //     toast({
  //       title: "Deleted",
  //       description: "User has been removed from database.",
  //     });
  //   } catch (error) {
  //     console.error("Error deleting user:", error);
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to delete user.",
  //     });
  //   }
  // };

  const handleVerificationAction = async (
    requestId: string,
    userId: string,
    approved: boolean
  ) => {
    if (!userData?.isAdmin) return;

    try {
      await updateDoc(doc(db, "verificationRequests", requestId), {
        status: approved ? "approved" : "rejected",
        reviewedBy: currentUser?.uid,
        reviewedAt: new Date().toISOString(),
      });

      if (approved) {
        await updateDoc(doc(db, "users", userId), {
          isVerified: true,
          verifiedAt: new Date().toISOString(),
          verifiedBy: currentUser?.uid,
        });
      }

      setVerificationRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );

      toast({
        title: approved ? "User verified" : "Request rejected",
        description: approved
          ? "The user has been successfully verified."
          : "The verification request has been rejected.",
      });
    } catch (error) {
      console.error("Error handling verification request:", error);
      toast({
        variant: "destructive",
        title: "Action failed",
        description:
          "An error occurred while processing the request. Please try again.",
      });
    }
  };

  if (!userData?.isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <XCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-center">
          You don't have permission to access the admin dashboard.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container py-8 mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Link>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, verification requests, and send broadcasts
          </p>
        </div>
        <BroadcastMessage users={users} isAdmin={userData?.isAdmin} />
      </div>

      <DashboardStats users={users} totalStories={storiesCount} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>Verification Requests</span>
            {verificationRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {verificationRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Broadcasts</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>Reports</span>
            {reports.length > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                {reports.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verification">
          {verificationRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
              <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-medium">
                No pending verification requests
              </h3>
              <p className="text-muted-foreground">
                All verification requests have been processed.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {verificationRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 overflow-hidden rounded-full">
                          {request.user.photoURL ? (
                            <img
                              src={request.user.photoURL || "/placeholder.svg"}
                              alt={request.user.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {request.user.displayName}
                        </CardTitle>
                        <CardDescription>{request.user.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium">
                          Reason for verification
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {request.reason}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Requested on</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleVerificationAction(
                          request.id,
                          request.userId,
                          false
                        )
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() =>
                        handleVerificationAction(
                          request.id,
                          request.userId,
                          true
                        )
                      }
                    >
                      Approve
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <div className="rounded-lg border">
            <div className="grid grid-cols-4 gap-4 border-b p-4 font-medium">
              <div>User</div>
              <div>Email</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {users.map((user) => (
              <div
                key={user.uid}
                className="grid grid-cols-4 gap-4 border-b p-4 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL || "/placeholder.svg"}
                        alt={user.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{user.displayName}</span>
                  {user.disabled && (
                    <span className="text-[10px] text-red-500 font-bold uppercase">
                      DISABLED
                    </span>
                  )}
                </div>
                <div className="flex items-center">{user.email}</div>
                <div className="flex items-center gap-2">
                  {user?.isAdmin && (
                    <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" />
                      Developer
                    </span>
                  )}
                  {user.isVerified ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unverified</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={user.disabled ? "default" : "secondary"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    title={user.disabled ? "Enable Account" : "Disable Account"}
                    onClick={() =>
                      handleToggleStatus(user.uid, !!user.disabled)
                    }
                  >
                    {user.disabled ? (
                      <Power className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4 text-orange-600" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Delete User"
                    onClick={() =>
                      initiateDeleteUser(user.uid, user.displayName)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="broadcasts">
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-medium">Send a Broadcast Message</h3>
            <p className="mb-4 text-muted-foreground">
              Use the broadcast feature to send messages to multiple users at
              once.
            </p>
            <BroadcastMessage users={users} isAdmin={userData?.isAdmin} />
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2">
            {reports.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                <p>All clean! No pending reports.</p>
              </div>
            ) : (
              reports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base text-red-500 font-bold uppercase tracking-wider">
                          {report.reason}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Reported{" "}
                          {new Date(report.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Pending
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    <div className="p-3 bg-muted rounded-md text-xs font-mono break-all">
                      User ID: {report.targetUserId}
                      <br />
                      Content: {report.contentPreview.substring(0, 50)}...
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          initiateDeleteUser(
                            report.targetUserId,
                            "Reported User"
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Ban User
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReportAction(report.id, "dismiss")}
                      >
                        Dismiss
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleReportAction(report.id, "resolve")}
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Delete Account Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You are about to delete <strong>{userToDelete?.name}</strong>.
              <br />
              <br />
              This action cannot be undone. It will permanently delete their:
              <ul className="list-disc list-inside mt-2 text-sm text-zinc-300">
                <li>Login Access (Authentication)</li>
                <li>User Profile Data</li>
                <li>Chat History & Stories</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-white hover:text-white"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteUser();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
