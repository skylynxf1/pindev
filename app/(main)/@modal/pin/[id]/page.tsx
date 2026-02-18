import PinModal from '@/components/modal/PinModal'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ModalSlotPage({ params }: Props) {
  const { id } = await params
  return <PinModal pinId={id} />
}