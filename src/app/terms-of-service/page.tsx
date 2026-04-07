import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-muted/30 p-4 sm:p-8 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Terms of Service</CardTitle>
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
            Please read these terms and conditions carefully before using Our Service. This is a template and should be replaced with your own legal text.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Acknowledgment</h2>
          <p>
            These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.
          </p>
          <p>
            Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.
          </p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">User Accounts</h2>
          <p>
            When You create an account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service.
          </p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, loss of data or other information, for business interruption, for personal injury, loss of privacy arising out of or in any way related to the use of or inability to use the Service).
          </p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">"AS IS" and "AS AVAILABLE" Disclaimer</h2>
          <p>
            The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind.
          </p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4 border-t mt-6">Contact Us</h2>
          <p>If you have any questions about these Terms, You can contact us by email at a placeholder address.</p>
        </CardContent>
      </Card>
    </div>
  );
}
