import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-muted/30 p-4 sm:p-8 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p className="font-semibold">Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
          </p>
          <p>
            We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy. This Privacy Policy has been created with the help of a generic template and should be replaced with your own legal text.
          </p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Interpretation and Definitions</h2>
          <p>
            The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Collecting and Using Your Personal Data</h2>
          <h3 className="text-lg font-semibold text-foreground pt-2">Types of Data Collected</h3>
          <h4 className="font-semibold text-foreground">Personal Data</h4>
          <p>
            While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Usage Data</li>
          </ul>

          <h4 className="font-semibold text-foreground mt-2">Usage Data</h4>
          <p>Usage Data is collected automatically when using the Service.</p>
          <p>
            Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Use of Your Personal Data</h2>
          <p>The Company may use Personal Data for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
              <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
              <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.</li>
              <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
          </ul>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Changes to this Privacy Policy</h2>
          <p>
            We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.
          </p>
          <p>
            You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, You can contact us by email at a placeholder address.</p>
        </CardContent>
      </Card>
    </div>
  );
}
