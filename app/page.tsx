import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/clerk'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  
  // Get posts count as an example
  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Next.js + Supabase + Clerk
          </h1>
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            <p className="text-gray-600 mb-4">
              Powered by Clerk for secure user authentication and management.
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Ready to use</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Database</h2>
            <p className="text-gray-600 mb-4">
              Supabase provides a powerful PostgreSQL database with real-time features.
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {postsCount || 0} posts in database
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">User Profile</h2>
            {user ? (
              <div className="space-y-2">
                <p className="text-gray-600">
                  Welcome back, {user.first_name}!
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            ) : (
              <p className="text-gray-600">
                Sign in to see your profile information.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold">Configure Environment Variables</h3>
                <p className="text-gray-600">Copy <code className="bg-gray-100 px-2 py-1 rounded">env.example</code> to <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> and fill in your API keys.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h3 className="font-semibold">Start Supabase</h3>
                <p className="text-gray-600">Run <code className="bg-gray-100 px-2 py-1 rounded">npm run db:start</code> to start your local Supabase instance.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h3 className="font-semibold">Run Migrations</h3>
                <p className="text-gray-600">Execute <code className="bg-gray-100 px-2 py-1 rounded">npm run db:reset</code> to set up your database schema.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <h3 className="font-semibold">Start Development</h3>
                <p className="text-gray-600">Run <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code> to start your development server.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
