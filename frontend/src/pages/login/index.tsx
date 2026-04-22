import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useLogin, useSession } from '@/features/auth'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Input } from '@/shared/ui/primitives/Input'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './LoginPage.module.css'

type LoginFormState = {
    login: string
    password: string
}

const initialFormState: LoginFormState = {
    login: '',
    password: '',
}

export function LoginPage() {
    const navigate = useNavigate()
    const loginMutation = useLogin()
    const session = useSession()
    const [form, setForm] = useState<LoginFormState>(initialFormState)

    useEffect(() => {
        if (session.isAuthenticated) {
            navigate(ROUTES.DASHBOARD, { replace: true })
        }
    }, [navigate, session.isAuthenticated])

    const isCheckingSession = 
        session.status === 'unknown' && session.isPending

    const isSubmitting = 
        loginMutation.isPending

    const errorMessage = 
        loginMutation.error
        ? getErrorMessage(loginMutation.error, 'Failed to sign in')
        : null

    function handleChange<K extends keyof LoginFormState>(key: K, value: LoginFormState[K]) {
        setForm((current) => ({ ...current, [key]: value }))
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        loginMutation.mutate(form, {
            onSuccess: () => {
                navigate(ROUTES.DASHBOARD, { replace: true })
            },
        })
    }

    return (
        <main className={styles.page}>
            <Container className={styles.layout}>
                <section className={styles.intro}>
                    <Text as="span" size="sm" caps tone="accent">
                        omnia_detect
                    </Text>
                    <Heading as="h1" size="display" tight className={styles.title}>
                        Sign in to the workspace.
                    </Heading>
                    <Text as="span" size="sm" tone="muted">
                        To switch to Workspace, sign in to your Omnia Detect Account. <br></br>
                        This account will be available in your browser.
                    </Text>
                </section>

                <Card as="section" padding="xl" gap="lg" className={styles.card}>
                    <Card.Header className={styles.cardHeader}>
                        <div>
                            <Card.Title as="h2">Authentication</Card.Title>
                            <Card.Description>
                                Enter your credentials to restore the protected API clients.
                            </Card.Description>
                        </div>
                    </Card.Header>

                    <Card.Content>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <Field>
                                <Field.Label htmlFor="login">Login</Field.Label>
                                <Field.Control>
                                    <Input
                                        id="login"
                                        name="login"
                                        autoComplete="username"
                                        value={form.login}
                                        onChange={(event) =>
                                            handleChange('login', event.target.value)
                                        }
                                        placeholder="username or email"
                                        required
                                    />
                                </Field.Control>
                            </Field>

                            <Field>
                                <Field.Label htmlFor="password">Password</Field.Label>
                                <Field.Control>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={form.password}
                                        onChange={(event) =>
                                            handleChange('password', event.target.value)
                                        }
                                        placeholder="password"
                                        required
                                    />
                                </Field.Control>
                            </Field>

                            {errorMessage ? (
                                <Text as="p" size="sm" surface="danger">
                                    {errorMessage}
                                </Text>
                            ) : null}

                            {isCheckingSession ? (
                                <Text as="p" size="sm" tone="muted">
                                    Checking for an existing session...
                                </Text>
                            ) : null}

                            <div className={styles.actions}>
                                <Button
                                    type="submit"
                                    fluid
                                    disabled={isSubmitting || isCheckingSession}
                                >
                                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                                </Button>
                            </div>
                        </form>
                    </Card.Content>
                </Card>
            </Container>
        </main>
    )
}
