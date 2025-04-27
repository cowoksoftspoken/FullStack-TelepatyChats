"use client";

import { ArrowLeft } from "lucide-react";
import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <React.Fragment>
      <div className="w-full md:w-3/4 mx-auto py-6 bg-white dark:bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back To App
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Privacy Policy
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: Apr 26, 2025
              <br />
              <br />
              Please read this Privacy Policy carefully before using the
              Zerochats application (the "Service") operated by ISB Developer.
            </p>
          </div>
        </div>
      </div>
      <div className="w-full py-6 bg-gray-100 md:w-3/4 mx-auto dark:bg-background">
        <div className="container px-4 md:px-6">
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <h2>Interpretation and Definitions</h2>
            <p>
              The words of which the initial letter is capitalized have meanings
              defined under the following conditions. The following definitions
              shall have the same meaning regardless of whether they appear in
              singular or in plural.
            </p>
            <h3>For the purposes of this Privacy Policy:</h3>
            <ul>
              <li>
                <strong>You</strong> means the individual accessing or using the
                Service, or other legal entity on behalf of which such
                individual is accessing or using the Service, as applicable.
              </li>
              <li>
                <strong>Developer</strong> (referred to as either "the
                Developer", "I", "Me" or "My" in this Agreement) refers to ISB
                Developer.
              </li>
              <li>
                <strong>Personal Data</strong> means any information that
                relates to an identified or identifiable individual.
              </li>
              <li>
                <strong>Usage Data</strong> is data collected automatically when
                using the Service.
              </li>
            </ul>
            <h2>Collecting and Using Your Personal Data</h2>
            <h3>Types of Data Collected</h3>
            <h4>Personal Data</h4>
            <p>
              While using the Service, I may ask you to provide Me with certain
              personally identifiable information that can be used to contact or
              identify you. Personally identifiable information may include, but
              is not limited to:
            </p>
            <ul>
              <li>Email address</li>
              <li>Photo profile</li>
              <li>Your protected and encrypted chat data</li>
              <li>DisplayName</li>
              <li>Last seen, Typing status, Online status, etc</li>
            </ul>
            <h4>Usage Data</h4>
            <p>
              Usage Data is collected automatically when You interact with the
              Service, such as when You log in or engage in chats.
            </p>
            <h3>Use of Your Personal Data</h3>
            <p>
              The Developer may use Personal Data for the following purposes:
            </p>
            <ul>
              <li>
                <strong>To Improve Our Service:</strong> The information we
                collect is used to analyze and understand how the Service is
                used, allowing us to continuously improve its features,
                functionality, and user experience. The use of this data is
                limited to the purpose of enhancing the Service.
              </li>
              <li>
                <strong>For Service Providers:</strong> The information we
                collect is shared with third-party service providers to help
                improve and optimize the Service.
              </li>
            </ul>
            <h2>Ownership and Sharing of Your Information</h2>
            <p>
              We want to emphasize that your personal information is rightfully
              yours. We do not share your personal information with any third
              parties.
            </p>
            <h2>Retention of Your Personal Data</h2>
            <p>
              Your personal information is securely stored within our cloud and
              database.
            </p>
            <h2>Security of Your Personal Data</h2>
            <p>
              The security of your data is Our priority. We implement
              multi-layered security measures, including end-to-end encryption
              and Base64, to protect your information from unauthorized access.
            </p>
            <h2>Access to and Updating Your Personal Data</h2>
            <p>
              You have the ability to access and update your personal data
              through the user interface (UI/UX) of the application that We have
              provided.
            </p>
            <h2>Children's Privacy Policy</h2>
            <p>
              Our Service is not intended for users under the age of 13. We do
              not knowingly collect personally identifiable information from
              children under the age of 13. Users of the Service are expected to
              be 13 years of age or older.
            </p>
            <h2>Notification of Changes to this Privacy Policy</h2>
            <p>
              Any significant changes to this Privacy Policy will be notified to
              You through a pop-up notification within the application and via
              the email address registered to your account.
            </p>
            <h2>Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy
              Policy, you can contact us via email:{" "}
              <a href="mailto:dbgaming679@gmail.com" className="text-blue-500">
                Contact Developer
              </a>
            </p>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
