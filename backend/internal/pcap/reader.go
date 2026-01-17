package pcap

import (
	"bufio"
	"os"

	"github.com/google/gopacket"
	"github.com/google/gopacket/pcapgo"
)

func openPacketSource(path string) (*gopacket.PacketSource, *os.File, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}

	buffered := bufio.NewReader(file)
	magic, err := buffered.Peek(4)
	if err != nil {
		file.Close()
		return nil, nil, err
	}

	if isPcapngMagic(magic) {
		ngReader, err := pcapgo.NewNgReader(buffered, pcapgo.DefaultNgReaderOptions)
		if err != nil {
			file.Close()
			return nil, nil, err
		}
		return gopacket.NewPacketSource(ngReader, ngReader.LinkType()), file, nil
	}

	reader, err := pcapgo.NewReader(buffered)
	if err != nil {
		file.Close()
		return nil, nil, err
	}
	return gopacket.NewPacketSource(reader, reader.LinkType()), file, nil
}
