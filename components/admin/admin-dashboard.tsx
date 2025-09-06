"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import {
  CheckCircle,
  XCircle,
  User,
  Users,
  MessageSquare,
  ArrowLeft,
  Crown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BroadcastMessage } from "@/components/admin/broadcast-message";
import { useFirebase } from "@/lib/firebase-provider";
import { toast } from "@/components/ui/use-toast";
import type { User as UserType } from "@/types/user";
import type { VerificationRequest } from "@/types/admin";
import Link from "next/link";

export function AdminDashboard({ userData }: { userData?: DocumentData }) {
  const { db, currentUser } = useFirebase();
  // const [userData, setUserData] = useState<UserType | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<
    (VerificationRequest & { user: UserType })[]
  >([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("verification");

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
      } finally {
        setIsLoading(false);
      }
    };

    fetchVerificationRequests();
    fetchUsers();
  }, [userData, db]);

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
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                  {!user.isVerified && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleVerificationAction("manual", user.uid, true)
                      }
                    >
                      Verify
                    </Button>
                  )}
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
      </Tabs>
    </div>
  );
}
