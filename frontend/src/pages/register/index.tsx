import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useRegister, useSession } from '@/features/auth'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Grid } from '@/shared/ui/compound/Grid'
import { Button } from '@/shared/ui/primitives/Button'
import { Container } from '@/shared/ui/primitives/Container'
import { Heading } from '@/shared/ui/primitives/Heading'
import { Input } from '@/shared/ui/primitives/Input'
import { Text } from '@/shared/ui/primitives/Text'
import styles from './RegisterPage.module.css'

type RegisterFormState = {
    login: string
    name: string
    password: string
    passwordConfirmation: string
}

const initialFormState: RegisterFormState = {
    login: '',
    name: '',
    password: '',
    passwordConfirmation: '',
}

export function RegisterPage() {
    const navigate = useNavigate()
    const registerMutation = useRegister()
    const session = useSession()
    const [form, setForm] = useState<RegisterFormState>(initialFormState)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        if (session.isAuthenticated) {
            navigate(ROUTES.DASHBOARD, { replace: true })
        }
    }, [navigate, session.isAuthenticated])

    const isCheckingSession =
        session.status === 'unknown' && session.isPending

    const isSubmitting =
        registerMutation.isPending

    const errorMessage =
        formError ??
        (registerMutation.error
            ? getErrorMessage(registerMutation.error, 'Failed to create account')
            : null)

    function handleChange<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) {
        setFormError(null)
        setForm((current) => ({ ...current, [key]: value }))
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (form.password !== form.passwordConfirmation) {
            setFormError('Passwords do not match')
            return
        }

        registerMutation.mutate(
            {
                login: form.login,
                password: form.password,
                name: form.name.trim() || undefined,
            },
            {
                onSuccess: () => {
                    navigate(ROUTES.DASHBOARD, { replace: true })
                },
            },
        )
    }

    return (
        <main className={styles.page}>
            <Container size="lg" center>
                <Grid columns={2} gap="xl" align="center" layout="auto" minItemWidth="20rem">
                    <Grid as="section" gap="lg">
                        <Text as="span" size="sm" caps tone="accent">
                            omnia_detect
                        </Text>
                        <Heading as="h1" size="display" tight measure="md">
                            Create your workspace account.
                        </Heading>
                        <Text as="p" size="sm" tone="muted" measure="lg">
                            Register once, then use the account to access protected Omnia Detect
                            tools from this browser.
                        </Text>
                    </Grid>

                    <Card as="section" padding="xl" gap="lg">
                        <Card.Header>
                            <Card.Title as="h2">Registration</Card.Title>
                            <Card.Description>
                                Create a login for the protected API clients.
                            </Card.Description>
                        </Card.Header>

                        <Card.Content>
                            <Grid as="form" gap="lg" onSubmit={handleSubmit}>
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
                                            minLength={3}
                                            maxLength={64}
                                            required
                                        />
                                    </Field.Control>
                                </Field>

                                <Field>
                                    <Field.Label htmlFor="name">Display Name</Field.Label>
                                    <Field.Control>
                                        <Input
                                            id="name"
                                            name="name"
                                            autoComplete="name"
                                            value={form.name}
                                            onChange={(event) =>
                                                handleChange('name', event.target.value)
                                            }
                                            placeholder="optional"
                                            maxLength={120}
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
                                            autoComplete="new-password"
                                            value={form.password}
                                            onChange={(event) =>
                                                handleChange('password', event.target.value)
                                            }
                                            placeholder="at least 8 characters"
                                            minLength={8}
                                            maxLength={256}
                                            required
                                        />
                                    </Field.Control>
                                </Field>

                                <Field>
                                    <Field.Label htmlFor="passwordConfirmation">
                                        Confirm Password
                                    </Field.Label>
                                    <Field.Control>
                                        <Input
                                            id="passwordConfirmation"
                                            name="passwordConfirmation"
                                            type="password"
                                            autoComplete="new-password"
                                            value={form.passwordConfirmation}
                                            onChange={(event) =>
                                                handleChange(
                                                    'passwordConfirmation',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="repeat password"
                                            minLength={8}
                                            maxLength={256}
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

                                <Button
                                    type="submit"
                                    fluid
                                    disabled={isSubmitting || isCheckingSession}
                                >
                                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </Grid>
                        </Card.Content>

                        <Card.Footer>
                            <Text as="p" size="sm" tone="muted" align="center">
                                Already registered?
                            </Text>
                            <Button
                                as={Link}
                                to={ROUTES.LOGIN}
                                variant="outline"
                                color="neutral"
                                fluid
                            >
                                Sign In
                            </Button>
                        </Card.Footer>
                    </Card>
                </Grid>
            </Container>
        </main>
    )
}
