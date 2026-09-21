<?php
//============================================================+
// File name   : example_002.php
// Begin       : 2008-03-04
// Last Update : 2013-05-14
//
// Description : Example 002 for TCPDF class
//               Removing Header and Footer
//
// Author: Nicola Asuni
//
// (c) Copyright:
//               Nicola Asuni
//               Tecnick.com LTD
//               www.tecnick.com
//               info@tecnick.com
//============================================================+

/**
 * Creates an example PDF TEST document using TCPDF
 * @package com.tecnick.tcpdf
 * @abstract TCPDF - Example: Removing Header and Footer
 * @author Nicola Asuni
 * @since 2008-03-04
 */

// Include the main TCPDF library (search for installation path).
//require_once('tcpdf_include.php');
// Include the main TCPDF library (search for installation path).
require_once "config-autocomplete.php";
require_once('../tcpdf_barcodes_1d.php');
require_once('tcpdf_include.php');
require_once('../fpdf/fpdf.php');
require_once('../fpdi/fpdi.php');
require('rotation.php');
// initiate FPDI
//$pdf->AddPage('P', 'A4');

 //$basefile = "c:/xampp/htdocs/catia/data/";
 $basefile = "/data/edm/aplikasi/catia/";
 $nmfile = $_REQUEST["nmfilearr"];
 $nmpath = $_REQUEST["nmpath"];
  $jdl = $_REQUEST["jdl"];
 $ndmf= $_REQUEST["ndm"];
  $kuid = $_REQUEST["kuid"];
 $tglr = $_REQUEST["tgl"];
 $tglrel= "REL EDM " . date ('d-M-Y' ,strtotime( $tglr));
  $tgls= date("Y-m-d H:i:s");
 //$difile = "c:/xampp/htdocs/catia/data/".$nmpath ;
 $difile = "/data/edm/aplikasi/catia/".$nmpath ;
 //$sql = "select username,kuid,userlevel,Provinsi,Config_penghasil from useraccounts where kuid='$kuid%'";
 $sql = "select username,userlevel,Config_penghasil from standard.useraccounts where kuid='$kuid'";
$rsd = mysql_query($sql);

while($rs = mysql_fetch_array($rsd)) {
    $idlvl = trim($rs['userlevel']);
	$username = trim($rs['username']);
	$cname = trim($rs['Config_penghasil']);
}

/*
$sqlb="SELECT COUNT(*) AS jumlah FROM `standard` where remark!='D' and  type='man'";
    $rsb=$dbcon["dashboard"]->Execute($sqlb);
    $jumlahb = $rsb->fields["jumlah"];
	$query1=mysql_query("insert into standard (`type`, `nmpath`, `number`, `pdf`, `revision`, `date`, `title`, `category`, `control_sheet`, `remark`) values('$type','$nmpath','$number','-','$revision','$date','$title','$category','$control_sheet','$remark')");

*/

$sqlhis = "insert into history (judul,username,nama,Tanggal,nmdoc) values ('$jdl', '$username', '$cname','$tgls','$ndmf')";
//$rs=$dbcon["dashboard"]->Execute($sqlhis);
//echo "acas ==> $sqlhis ";
$rsb=mysql_query($sqlhis);
//$rsb=mysql_query("insert into history (judul,username,nama) values ('$jdl', '$username', '$cname')");
/* if ( !$cname )
{
 echo "You are no Eligible/Authorized";
 exit;
} */
$pdf =& new FPDI();
/*
function Rotate($angle,$x=-1,$y=-1)
{
	if($x==-1)
		$x=$this->x;
	if($y==-1)
		$y=$this->y;
	if($this->angle!=0)
		$this->_out('Q');
	$this->angle=$angle;
	if($angle!=0)
	{
		$angle*=M_PI/180;
		$c=cos($angle);
		$s=sin($angle);
		$cx=$x*$this->k;
		$cy=($this->h-$y)*$this->k;
		$this->_out(sprintf('q %.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm',$c,$s,-$s,$c,$cx,$cy,-$cx,-$cy));
	}
}
*/
//$pdf->AddPage('L', 'A3');

//acas

/*
class PDF extends PDF_Rotate
{
function Header()
{
	//Put the watermark
	$this->SetFont('Arial','B',50);
	$this->SetTextColor(255,192,203);
	$this->RotatedText(35,190,'W a t e r m a r k   d e m o',45);
}

function RotatedText($x, $y, $txt, $angle)
{
	//Text rotated around its origin
	$this->Rotate($angle,$x,$y);
	$this->Text($x,$y,$txt);
	$this->Rotate(0);
}
}
*/
//acas

//Set the source PDF file
//$pagecount = $pdf->setSourceFile("testm.pdf");
$pagecount = $pdf->setSourceFile("$difile");

//Import the first page of the file (Page 1 )
//$tplIdx=$tpl = $pdf->importPage(1);
//$size = $pdf->getTemplateSize($tplIdx);
//add a Page
//$pdf->AddPage();
//tambahkan loop untuk pdf lebih dari satu halaman (pdfmerge)
//$tgl=" 24 April 2016";
$tgl = date("d-M-Y");
//$tgl =date("Y-m-d H:i:s");
//$tgl =date("d-M-Y H:i:s");
for($i = 1; $i <= $pagecount; $i++){
//$pdf->AddPage('L', 'A3');
//Import the first page of the file (Page 1 until end)
$tplIdx=$tpl = $pdf->importPage($i);
$size = $pdf->getTemplateSize($tplIdx);

//Use this page as template
/*
$pdf->useTemplate($tpl);

#Print Hello World at the bottom of the page

//Go to 1.5 cm from bottom
$pdf->SetY(-15);
//Select Arial italic 8
$pdf->SetFont('Arial','I',8);
//Print centered cell with a text in it
$pdf->Cell(0, 10, "Hello World", 0, 0, 'C');

$pdf->Output("my_modified_pdf.pdf", "F");
*/
// use the imported page as the template 
//$pdf->useTemplate($tplIdx, 0, 0); 
//$pdf ->useTemplate($tplIdx, null, null, $size['w'], 310, FALSE);
//$pdf ->useTemplate($tplIdx, null, null, 215.6, 350.9,FALSE);
$panjang= $size['w'] ;
$tinggi = $size['h'] - 20  ;
//echo " test hal : $i ==> width = $panjang ==>height = $tinggi <br>";
/*
test hal : 1 ==> width = 210.058 ==>height = 276.926   ==> portrait
test hal : 13 ==> width = 296.926 ==>height = 190.058  ==> landsape
*/
$pcode="A4";
if ($panjang > 100 )
{
 if ($panjang > 1000 )
 {
  $pdf->AddPage('P', 'A0');
  $pcode="A0";
 }
else if ($panjang > 800 )
{
$pdf->AddPage('P', 'A1');
$pcode="A1";
}
else if ($panjang > 500 )
{
$pdf->AddPage('P', 'A2');
$pcode="A2";
}
else if ($panjang > 400 )
{
$pcode="A3";
$pdf->AddPage('P', 'A3');
}
 else if ($panjang > 240 )
 {
  $pdf->AddPage('L', 'A4');
 //echo "<br>==> Kadieu ";
 //$pdf->AddPage();
 }
 else 
 {
 
 $pdf->AddPage('P', 'A4');
 //echo "<br>==> Kadieu ";
 //$pdf->AddPage();
 }
}
else
{
 if ($panjang > 46 )
  {
   $pdf->AddPage('P', 'A0');
   $pcode="A0";
   }
else if ($panjang > 33 )
{
$pdf->AddPage('P', 'A1');
$pcode="A1";
}
else if ($panjang > 23 )
{
$pdf->AddPage('P', 'A2');
$pcode="A2";
}
else if ($panjang > 16 )
{
$pcode="A3";
$pdf->AddPage('P', 'A3');
}
  else
  {
   // $pdf->AddPage('P', 'A4');
	$pdf->AddPage();
  }
}

$pdf ->useTemplate($tplIdx, 0, 0, $size['w'], $size['h'],FALSE);

$ukuran = $size['w'] ."-" .  $size['h'];
// now write some text above the imported page 

//it is run using fpdf.php
/*
$pdf->SetFont('helvetica','I',12);
$pdf->SetTextColor(255,0,0); 
$pdf->SetXY(25, 25); 
$pdf->Write(0, "This is just a simple text"); 
*/
//$pdf->RotatedText(35,190,'W a t e r m a r k   d e m o',45);
//Put the watermark
/*
	$pdf->SetFont('helvetica','B',50);
	$pdf->SetTextColor(255,192,203);
	$pdf->RotatedText(35,190,'W a t e r m a r k   d e m o',45);
*/
// set alpha to semi-transparency
/*
$pdf->SetAlpha(0.5);
$pdf->SetXY(5, 25); 
$pdf->setTextRenderingMode($stroke=0.2, $fill=true, $clip=false);
$pdf->Write(0, 'W a t e r m a r k   d e m o', '', 0, '', true, 0, false, false, 0);
*/
$watermark ="            Uncontrolled Doc by $cname at $tgl ";
//echo "$cname  $watermark" ;
$pdf->StartTransform();
$pdf->SetAlpha(0.2);
$pdf->SetFont('helvetica','B',16);
$pdf->SetTextColor(234,18,18);
//$pdf->Rotate(60, 220, 100);
$pdf->Rotate(60, 220, 70);
//$pdf->SetXY(35, 0);

//mulai watermark different size
/*



A3                842      1190
A4                595      842
A5                421      595
A6                297      421
B5                501      709
*/

if ($pcode == 'A0')
{
//A0                2380    3368
//$pdf->write1DBarcode($drwnum, 'C128A', 1065, 10, 100, 22, 0.4, $style, 'N');
//$pdf->Image('images/3a.png',375, 8, 5, 5, 'PNG'); 
//$pdf->Rotate(15, 700, 400);
//$pdf->SetXY(620, 800);
//$pdf->Rotate(30, 5, $tinggi);
$pdf->Rotate(-30, 5, 5);
$pdf->SetXY(10,5);

}
else if ($pcode == 'A1')
{
//A1                1684    2380
//$pdf->write1DBarcode($drwnum, 'C128A', 720, 8, 90, 20, 0.4, $style, 'N');
//$pdf->Image('images/3a.png',375, 8, 5, 5, 'PNG'); 

//$pdf->Rotate(15, 400, 310);
//$pdf->SetXY(400, 510);
$pdf->Rotate(-30, 5, 5);
$pdf->SetXY(10, 5);
}
else if ($pcode == 'A2')
{
//A2                1190    1684
//$pdf->Rotate(15, 350, 110);
//$pdf->SetXY(145, 350);
//$pdf->write1DBarcode($drwnum, 'C128A', 490, 6, 80, 19, 0.4, $style, 'N');
//$pdf->Image('images/3a.png',375, 8, 5, 5, 'PNG'); 
$pdf->Rotate(-30, 5, 5);
$pdf->SetXY(10, 5);
}
else if ($pcode == 'A3')
{
//$pdf->Rotate(15, 270, 110);
//$pdf->SetXY(35, 210);
$pdf->Rotate(-30, 5, 5);
$pdf->SetXY(10, 5);
//$pdf->write1DBarcode($drwnum, 'C128A', 340, 5, 70, 18, 0.4, $style, 'N');
//$pdf->Image('images/3a.png',375, 8, 5, 5, 'PNG'); 
}
else
{
//$pdf->Rotate(15, 270, 110);
//$pdf->SetXY(35, 190);
$pdf->SetXY(5, 0);
//$pdf->write1DBarcode($drwnum, 'C128A', 150, 5, 70, 18, 0.4, $style, 'N');
//$pdf->Image('images/3a.png',375, 8, 5, 5, 'PNG'); 
}


//end

/*
$pdf->setTextRenderingMode($stroke=0.3, $fill=false, $clip=true);
$pdf->Write(0, 'Stroke text and add to path for clipping', '', 0, '', true, 0, false, false, 0);
$pdf->Image('images/image_demo.jpg', 15, 75, 170, 10, '', '', '', true, 72);
*/

$pdf->setTextRenderingMode($stroke=0, $fill=true, $clip=true);
$pdf->Write(0, $watermark, '', 0, '', true, 0, false, false, 0);
//$pdf->Image('images/image_demo.jpg', 15, 65, 170, 10, '', '', '', true, 72);

$pdf->StopTransform();

$pdf->SetAlpha(1);


/*
$pdf->StartTransform();
// Rotate 20 degrees counter-clockwise centered by (70,110) which is the lower left corner of the rectangle
$pdf->Rotate(20, 70, 110);
$pdf->Rect(70, 100, 40, 10, 'D');
$pdf->Text(70, 96, 'Rotate');
// Stop Transformation
$pdf->StopTransform();
*/
/*
$pdf->Write(0,$your_dynamic_content);	
$pdf->Image($your_image_url,30,120,25);

    1st parameter takes URL of the image.
    2nd & 3rd parameter takes X & Y position respectively. (optional)
    4th & 5th parameter takes width and height values respectively. (optional)
    6th parameter takes image type � JPG, JPEG, PNG and GIF. (optional and case insensitive)
    7th parameter takes image anchor link. (optional)

*/
//now using tcpdf so can combine with barcode
// create content for signature (image and/or text)
//$pdf->Image('images/logo-ptdi.jpg', 318, 5, 20, 20, 'JPG'); 

//$pdf->Image('images/910113.jpg',320, 4, 22, 22, 'jpg'); 
/*
//it is run using fpdf.php

$pdf->SetFont('Arial'); 
$pdf->SetTextColor(255,0,0); 
$pdf->SetXY(25, 25); 
$pdf->Write(0, "This is just a simple text $ukuran"); 
$pdf->Image('images/tcpdf_signature.png',30,120,25);
*/
	

//$pdf->Output('newpdf.pdf', 'D'); 
//It is run using tcpdf.php
$pdf->SetFont('helvetica', '', 10);

// define barcode style
/*
$style = array(
	'position' => '',
	'align' => 'C',
	'stretch' => false,
	'fitwidth' => true,
	'cellfitalign' => '',
	'border' => true,
	'hpadding' => 'auto',
	'vpadding' => 'auto',
	'fgcolor' => array(0,0,0),
	'bgcolor' => false, //array(255,255,255),
	'text' => true,
	'font' => 'helvetica',
	'fontsize' => 8,
	'stretchtext' => 4
);
*/


$style = array(
	'position' => '',
	'align' => 'C',
	'stretch' => false,
	'fitwidth' => true,
	'cellfitalign' => '',
	'border' => true,
	'hpadding' => 'auto',
	'vpadding' => 'auto',
	'fgcolor' => array(0,0,0),
	'bgcolor' => false, //array(255,255,128),
	'text' => true,
	'label' => $tgl ,
	'font' => 'helvetica',
	'fontsize' => 8,
	'stretchtext' => 4
);
/*
$nomorspl="T-361ND00010-101-A";
//$pdf->Cell(340, 9, '22 Maret 16', 0, 1);
//$pdf->write1DBarcode('CODE 39', 'C39', '', '', '', 18, 0.4, $style, 'N');
$pdf->write1DBarcode($nomorspl, 'C128A', 335, 5, 70, 18, 0.4, $style, 'N');
//$pdf->Image('images/logo_ptdi.gif',370, 10, 10, 10, 'GIF'); 
$pdf->Image('images/3a.png',370, 8, 5, 5, 'PNG'); 
*/
// Right alignment
//$style['align'] = 'R';
//$pdf->Cell(0, 0, '22 Maret 16', 0, 1);
//$pdf->write1DBarcode('RIGHT', 'C128A', '', '', '', 15, 0.4, $style, 'N');
$pdf->Ln();
} //tutup looping halaman pdf
//Close and output PDF document
$pdf->Output("$jdl", 'I');
/*
// create new PDF document
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

// set document information
$pdf->SetCreator(PDF_CREATOR);
$pdf->SetAuthor('Nicola Asuni');
$pdf->SetTitle('TCPDF Example 002');
$pdf->SetSubject('TCPDF Tutorial');
$pdf->SetKeywords('TCPDF, PDF, example, test, guide');

// remove default header/footer
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

// set default monospaced font
$pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);

// set margins
$pdf->SetMargins(PDF_MARGIN_LEFT, PDF_MARGIN_TOP, PDF_MARGIN_RIGHT);

// set auto page breaks
$pdf->SetAutoPageBreak(TRUE, PDF_MARGIN_BOTTOM);

// set image scale factor
$pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);

// set some language-dependent strings (optional)
if (@file_exists(dirname(__FILE__).'/lang/eng.php')) {
	require_once(dirname(__FILE__).'/lang/eng.php');
	$pdf->setLanguageArray($l);
}

// ---------------------------------------------------------

// set font
$pdf->SetFont('times', 'BI', 20);

// add a page
$pdf->AddPage();

// set some text to print
$txt = <<<EOD
TCPDF Example 002

Default page header and footer are disabled using setPrintHeader() and setPrintFooter() methods.
EOD;

// print a block of text using Write()
$pdf->Write(0, $txt, '', 0, 'C', true, 0, false, false, 0);

// ---------------------------------------------------------

//Close and output PDF document
$pdf->Output('example_002.pdf', 'I');
*/


//============================================================+
// END OF FILE
//============================================================+
