This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Dhall Ecom Admin UI Guidelines

- **Brand Gradient**: Indigo → Violet for primary actions and highlights.
- **Cards**: `rounded-2xl`, subtle border, `bg-white/80` with backdrop blur.
- **Inputs**: Rounded, light border, strong focus (`focus:border-indigo-500`, `focus:shadow-md`).
- **Buttons**: Primary uses gradient; outline for secondary actions.
- **Layout**: Centered content, gentle background gradient for auth screens.
- **Micro-interactions**: Small blobs/accents for visual polish; keep subtle.

### Reusable Components

- [components/ui/Button.jsx](components/ui/Button.jsx)
- [components/ui/Input.jsx](components/ui/Input.jsx)
- [components/ui/Label.jsx](components/ui/Label.jsx)
- [components/ui/Card.jsx](components/ui/Card.jsx)

Example usage:

```jsx
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

export default function Example() {
	return (
		<div className="min-h-svh flex items-center justify-center p-6">
			<Card className="p-8 w-full max-w-md">
				<Label htmlFor="email">Email</Label>
				<Input id="email" type="email" className="mt-1" />
				<Button className="mt-4">Continue</Button>
			</Card>
		</div>
	);
}
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
