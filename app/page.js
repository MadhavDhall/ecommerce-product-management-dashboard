import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

function CheckItem({ children }) {
  return (
    <li className="flex gap-2 text-sm text-gray-600">
      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-50 text-green-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
          <path
            fillRule="evenodd"
            d="M20.03 6.72a.75.75 0 0 1 0 1.06l-10.5 10.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.97 3.97 9.97-9.97a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export default function Home() {
  const features = [
    {
      title: "Company-based dashboard",
      description: "Each company gets its own dashboard and scoped data- clean separation by default.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M3 21V7l9-4 9 4v14" />
          <path d="M9 21v-8h6v8" />
        </svg>
      ),
    },
    {
      title: "Role-based users & permissions",
      description: "Give your team the right access. Actions depend on permissions- safer operations.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Product management",
      description: "Add, edit, and delete products with a consistent, table-first workflow.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M20.5 7.5 12 2 3.5 7.5 12 13l8.5-5.5Z" />
          <path d="M3.5 7.5V17L12 22l8.5-5V7.5" />
          <path d="M12 13v9" />
        </svg>
      ),
    },
    {
      title: "Inventory management",
      description: "Real-time stock tracking so your team always knows what’s available.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      ),
    },
    {
      title: "Analytics & charts",
      description: "Visualize revenue, orders, and inventory trends- faster decisions from one view.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 6-6" />
        </svg>
      ),
    },
  ];

  const flow = [
    { title: "Register Company", description: "Create your company workspace." },
    { title: "Owner Dashboard Created", description: "Dashboard is ready with full control." },
    { title: "Add Users & Assign Roles", description: "Invite team and set permissions." },
    { title: "Manage & Analyze Everything", description: "Operate daily workflows and track analytics." },
  ];

  const navLinkClass = "text-sm font-medium text-gray-600 hover:text-gray-900";

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="#top" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Dhall Ecom" className="h-8 w-8" />
            <div className="text-sm font-semibold tracking-tight text-gray-900">Dhall Ecom</div>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link className={navLinkClass} href="#features">Features</Link>
            <Link className={navLinkClass} href="#permissions">Users</Link>
            <Link className={navLinkClass} href="#flow">Flow</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="top" className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 h-96 w-3xl -translate-x-1/2 rounded-full bg-linear-to-r from-indigo-100 via-white to-violet-100 blur-2xl" />
            <div className="absolute -bottom-24 left-1/2 h-96 w-3xl -translate-x-1/2 rounded-full bg-linear-to-r from-violet-100 via-white to-indigo-100 blur-2xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-medium text-gray-600 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  Company operations, simplified
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                  Dhall Ecom: All-in-One Company Dashboard for Products, Inventory & Analytics
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Register your company, manage products and inventory, assign team roles, and visualize business analytics- all from one dashboard.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link href="/register">
                    <Button>Get Started</Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="outline">Explore Features</Button>
                  </Link>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[{ k: "Products", v: "Add / Edit" }, { k: "Inventory", v: "Live Stock" }, { k: "Analytics", v: "Charts" }].map((x) => (
                    <div key={x.k} className="rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur-sm">
                      <div className="text-xs font-medium text-gray-500">{x.k}</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-br from-indigo-100 via-white to-violet-100" />
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Dashboard preview</div>
                      <div className="mt-1 text-sm text-gray-600">What your team sees every day.</div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                      Company: Dhall
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Card className="p-4">
                      <div className="text-xs font-medium text-gray-500">Today</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">Orders</div>
                      <div className="mt-3 space-y-2">
                        {["#1042 Delivered", "#1043 Pending"].map((t) => (
                          <div key={t} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <div className="text-sm text-gray-700">{t}</div>
                            <span className="h-2 w-2 rounded-full bg-indigo-600" />
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-xs font-medium text-gray-500">Stock</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">Inventory</div>
                      <div className="mt-3 space-y-2">
                        {[{ n: "Cotton T-Shirt", v: 36 }, { n: "Denim Jeans", v: 16 }].map((r) => (
                          <div key={r.n} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <div className="truncate pr-2 text-sm text-gray-700">{r.n}</div>
                            <div className="text-sm font-semibold text-gray-900">{r.v}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-gray-500">Analytics</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">Revenue trend</div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">+18%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-12 items-end gap-1">
                      {[4, 7, 5, 9, 8, 10, 12, 9, 11, 13, 12, 14].map((h, i) => (
                        <div key={i} className="col-span-1">
                          <div className="w-full rounded-sm bg-linear-to-b from-indigo-600 to-violet-600" style={{ height: `${h * 4}px` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500">Features</div>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Everything you need for operations</h2>
            <p className="mt-1 text-sm text-gray-600">Clean, consistent UI- built to match the dashboard experience.</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                    {f.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{f.title}</div>
                    <div className="mt-1 text-sm text-gray-600">{f.description}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="permissions" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500">Users & Permissions</div>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Simple roles, clear control</h2>
            <p className="mt-1 text-sm text-gray-600">Owner sets up the company; users act based on assigned permissions.</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <div className="text-sm font-semibold text-gray-900">Owner</div>
              <p className="mt-1 text-sm text-gray-600">The owner is the primary admin for the company.</p>
              <ul className="mt-4 space-y-2">
                <CheckItem>Registers company</CheckItem>
                <CheckItem>Creates dashboard</CheckItem>
                <CheckItem>Adds users</CheckItem>
                <CheckItem>Manages permissions</CheckItem>
              </ul>
            </Card>

            <Card className="p-6">
              <div className="text-sm font-semibold text-gray-900">Users</div>
              <p className="mt-1 text-sm text-gray-600">Users work in the same dashboard with controlled access.</p>
              <ul className="mt-4 space-y-2">
                <CheckItem>Can view products, inventory & analytics</CheckItem>
                <CheckItem>Actions depend on permissions given</CheckItem>
              </ul>
            </Card>
          </div>
        </section>

        <section id="flow" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="text-center">
            <div className="text-xs font-medium text-gray-500">Simple Flow</div>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Get started in minutes</h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, idx) => (
              <Card key={step.title} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{step.title}</div>
                    <div className="mt-1 text-sm text-gray-600">{step.description}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Dhall Ecom" className="h-8 w-8" />
              <div>
                <div className="text-sm font-semibold tracking-tight text-gray-900">Dhall Ecom</div>
                <div className="text-sm text-gray-600">Company dashboard for operations & analytics</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link className={navLinkClass} href="#features">Features</Link>
              <Link className={navLinkClass} href="#permissions">Users</Link>
              <Link className={navLinkClass} href="#flow">Flow</Link>
              <Link className={navLinkClass} href="/register">Get Started</Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">© {new Date().getFullYear()} Dhall Ecom. All rights reserved.</div>
            <div className="text-sm text-gray-600">Built with Next.js + Supabase</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
