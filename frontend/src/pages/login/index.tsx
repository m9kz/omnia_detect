import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useLogin, useSession } from '@/features/auth'
import { getErrorMessage } from '@/shared/lib/errors'
import { Card } from '@/shared/ui/compound/Card'
import { Field } from '@/shared/ui/compound/Field'
import { Grid } from '@/shared/ui/compound/Grid'
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
            ? getErrorMessage(loginMutation.error, 'Не вдалося увійти')
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
            <Container size="lg" center>
                <Grid columns={2} gap="xl" align="center" layout="auto" minItemWidth="20rem">
                    <Grid as="section" gap="lg">
                        <Text as="span" size="sm" caps tone="accent">
                            omnia_detect
                        </Text>
                        <Heading as="h1" size="display" tight measure="md">
                            Увійдіть до робочого простору
                        </Heading>
                        <Text as="p" size="sm" tone="muted" measure="lg">
                            Omnia Detect зберігає доступ до датасетів, моделей і детекції в
                            захищеній сесії браузера.
                        </Text>
                    </Grid>

                    <Card as="section" padding="xl" gap="lg">
                        <Card.Header>
                            <Card.Title as="h2">Авторизація</Card.Title>
                            <Card.Description>
                                Введіть облікові дані, щоб продовжити роботу.
                            </Card.Description>
                        </Card.Header>

                        <Card.Content>
                            <Grid as="form" gap="lg" onSubmit={handleSubmit}>
                                <Field>
                                    <Field.Label htmlFor="login">Логін</Field.Label>
                                    <Field.Control>
                                        <Input
                                            id="login"
                                            name="login"
                                            autoComplete="username"
                                            value={form.login}
                                            onChange={(event) =>
                                                handleChange('login', event.target.value)
                                            }
                                            placeholder="логін або email"
                                            required
                                        />
                                    </Field.Control>
                                </Field>

                                <Field>
                                    <Field.Label htmlFor="password">Пароль</Field.Label>
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
                                            placeholder="пароль"
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
                                        Перевіряємо активну сесію...
                                    </Text>
                                ) : null}

                                <Button
                                    type="submit"
                                    fluid
                                    disabled={isSubmitting || isCheckingSession}
                                >
                                    {isSubmitting ? 'Вхід...' : 'Увійти'}
                                </Button>
                            </Grid>
                        </Card.Content>

                        <Card.Footer>
                            <Text as="p" size="sm" tone="muted" align="center">
                                Немає облікового запису?
                            </Text>
                            <Button
                                as={Link}
                                to={ROUTES.REGISTER}
                                variant="outline"
                                color="neutral"
                                fluid
                            >
                                Створити акаунт
                            </Button>
                        </Card.Footer>
                    </Card>
                </Grid>
            </Container>
        </main>
    )
}
